
class skill{
    constructor(){
        this.id=new Date().getTime()//时间戳ID
        this.name=new Date().getTime()//技能名称
        this.damage=0//技能伤害
        this.damageAfterBurst=0//调律爆裂后伤害
        this.type=2//技能类型，0调律爆裂，1调律，2共鸣，3虚数体，4自动炮（调律），5自动炮（共鸣）
        this.count=1//初始可用次数
        this.maxCount=1//运算中的最大可用次数（如雷主，古雷亚需要填写2）
        this.maxTotalCount=99//最大总可用次数
        this.preSkills=[]//前置技能
        this.mutualExclusionSkills=[]//互斥技能（列表中技能使用后，该技能永久无法使用）
        this.autoDamageCount=0//触发计数
        this.autoDamageTriggerCount=5//触发需要次数
        this.countFix=[]//*使用后为指定技能增加可用次数（特殊角色需自行换算）
        this.state=true//*技能可用状态标识（没想好怎么用）
        this.approximate=false//*是否为约值（目前计划一个情景内仅可在最后引入一个约值）
    }
}
class calc{
    constructor(skillList,health,targetHealth,burstStatus=false){
        this.skillList=skillList//技能列表
        this.health=health//血量
        this.targetHealth=targetHealth//目标血量
        this.burstStatus=burstStatus//调律爆裂状态
        //初始化
        this.result=[]//处理结果（取前三）
    }
    //技能数据解耦
    initSkill(){
        return this.skillList.map((item)=>{
            return JSON.parse(JSON.stringify(item))
        })
    }
    //初始化
    calcTree(callback){
        let situations=[]
        situations.push({
            skillList:this.initSkill(),
            health:this.health,
            targetHealth:this.targetHealth,
            burstStatus:this.burstStatus,
            currentPath:[]
        })
        this.calcSubTree(situations,callback)
    }
    //递归
    calcSubTree(situations,callback){
        console.log(situations.length)
        if(situations.length==0) return true;
        let newSituations=[]
        situations.forEach((situation,index)=>{
            let subSituationCount=0,lastSkillIndex=-1,lastSkill=null
            if(situation.currentPath.length>0){
                //排除自动炮
                let newPath=situation.currentPath.filter((item)=>{return item.type!=4&&item.type!=5})
                lastSkill=newPath[newPath.length-1]
                lastSkillIndex=situation.skillList.findIndex((e)=>{return e.id==lastSkill.id})
            }
            situation.skillList.forEach((skill,index)=>{
                //排除自动炮
                if(skill.type==4||skill.type==5) return;
                //不计算当前排序在上次使用的技能前的技能
                if(lastSkillIndex>index&&(!lastSkill||(lastSkill.type!=0&&lastSkill.type!=4&&lastSkill.type!=5))&&skill.type!=0) return;
                //判断技能是否可以使用
                if(!this.canIuse(situation,skill,index)) return;
                //使用技能并更新状态
                newSituations.push(this.useSkill(situation,skill))
                subSituationCount++
            })
            //无子情景则为最终态，需归档
            if(subSituationCount==0) this.resultDeal(situation);
            if(callback) callback(((index+1)*100/situations.length).toFixed(0));
        })
        return this.calcSubTree(newSituations,callback)
    }
    //判断技能是否可以使用*未增加自动炮临界判断
    canIuse(situation,skill,index){
        //技能不可用或可用次数不足
        if(!skill.state||skill.count<1) return false;
        //技能总可用次数不足
        if(situation.currentPath.filter(item=>item.id==skill.id).length>=skill.maxTotalCount) return false;
        //技能伤害过高
        if(Number(situation.health)-Number(situation.burstStatus?skill.damageAfterBurst:skill.damage)<Number(situation.targetHealth)) return false;
        //互斥技能
        if(skill.mutualExclusionSkills.some((mutualExclusionSkill) => situation.currentPath.findIndex(e => e.id==mutualExclusionSkill)>-1)) return false;
        //前置技能
        if(!skill.preSkills.every((preSkill) => situation.currentPath.findIndex(e => e.id==preSkill)>-1)) return false;
        //尝试扣除重复情景//不计算当前排序在上次使用的技能前的技能
        // if(situation.currentPath.length>0&situation.skillList.findIndex((e)=>{return e.id==situation.currentPath[situation.currentPath.length-1]})>index) return false;
        return true
    }
    //使用技能
    useSkill(situation,skill){
        //深拷贝
        let newSituation=JSON.parse(JSON.stringify(situation))
        //增加其他技能次数
        //可用次数-1
        newSituation.skillList.find((item)=>item.id==skill.id).count--
        //造成伤害
        if(newSituation.burstStatus){
            newSituation.health-=skill.damageAfterBurst
        }else{
            newSituation.health-=skill.damage
        }
        //调律爆裂
        if(skill.type==0){newSituation.burstStatus=true}
        //记录使用
        // newSituation.currentPath.push({id:skill.id,name:skill.name,damage:newSituation.burstStatus?skill.damageAfterBurst:skill.damage,autoDamage:0,type:skill.type,remainHealth:newSituation.health})
        newSituation.currentPath.push({id:skill.id,damage:newSituation.burstStatus?skill.damageAfterBurst:skill.damage,autoSkillIds:[],autoDamage:0,type:skill.type,remainHealth:newSituation.health})
        //newSituation.currentPath.push({id:skill.id,name:skill.name,type:skill.type})
        //使用自动炮*需考虑自动炮伤害超标,0调律爆裂，1调律，2共鸣，3虚数体，4自动炮（调律），5自动炮（共鸣）
        if(skill.type==1){
            newSituation.skillList.filter(autoSkill=>{ return autoSkill.type==4}).forEach(autoSkill=>{
                autoSkill.autoDamageCount++
                if(Number(autoSkill.autoDamageCount)>=Number(autoSkill.autoDamageTriggerCount)){
                    //触发自动炮
                    autoSkill.autoDamageCount=0;
                    if(newSituation.burstStatus){
                        newSituation.health-=autoSkill.damageAfterBurst
                    }else{
                        newSituation.health-=autoSkill.damage
                    }
                    //newSituation.currentPath.push({id:autoSkill.id,name:autoSkill.name,damage:newSituation.burstStatus?autoSkill.damageAfterBurst:autoSkill.damage,type:autoSkill.type,remainHealth:newSituation.health})
                    //不记录自动炮仅改写血量
                    newSituation.currentPath[newSituation.currentPath.length-1].remainHealth=newSituation.health
                    newSituation.currentPath[newSituation.currentPath.length-1].autoSkillIds=newSituation.currentPath[newSituation.currentPath.length-1].id
                    newSituation.currentPath[newSituation.currentPath.length-1].autoDamage=newSituation.currentPath[newSituation.currentPath.length-1].autoDamage+newSituation.burstStatus?autoSkill.damageAfterBurst:autoSkill.damage
                }
            })
            newSituation.skillList.filter(burstSkill=>{ return burstSkill.type==0}).forEach(burstSkill=>{
                burstSkill.count=(Number(burstSkill.count)+0.1).toFixed(4)
                if(burstSkill.count>=burstSkill.maxCount) burstSkill.count=burstSkill.maxCount
            })
        }
        if(skill.type==2){
            newSituation.skillList.filter(autoSkill=>{ return autoSkill.type==5}).forEach(autoSkill=>{
                autoSkill.autoDamageCount++
                if(Number(autoSkill.autoDamageCount)>=Number(autoSkill.autoDamageTriggerCount)){
                    //触发自动炮
                    autoSkill.autoDamageCount=0;
                    if(newSituation.burstStatus){
                        newSituation.health-=autoSkill.damageAfterBurst
                    }else{
                        newSituation.health-=autoSkill.damage
                    }
                    //newSituation.currentPath.push({id:autoSkill.id,name:autoSkill.name,damage:newSituation.burstStatus?autoSkill.damageAfterBurst:autoSkill.damage,type:autoSkill.type,remainHealth:newSituation.health})
                    //不记录自动炮仅改写血量
                    newSituation.currentPath[newSituation.currentPath.length-1].remainHealth=newSituation.health
                    newSituation.currentPath[newSituation.currentPath.length-1].autoSkillIds=newSituation.currentPath[newSituation.currentPath.length-1].id
                    newSituation.currentPath[newSituation.currentPath.length-1].autoDamage=newSituation.currentPath[newSituation.currentPath.length-1].autoDamage+newSituation.burstStatus?autoSkill.damageAfterBurst:autoSkill.damage
                }
            })
        }
        return newSituation
    }
    //归档结果并保留前一百项
    resultDeal(situation){
        //结果筛选
        if(Number(situation.health)<Number(situation.targetHealth)) return;
        this.result.push(situation)
        this.result=this.result.sort((a,b)=>{return Number(a.health)-Number(b.health)})
        this.result=this.result.slice(0,100)
    }
    getResult(){
        console.log(this.result)
        return this.result
    }
}
