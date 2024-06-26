
var work = new Worker("./worker.js")
var app = new Vue({
    el: '#app',
    data: () => {
        return {
            skillTypes: ["调律爆裂","调律", "共鸣", "虚数体", "自动炮（调律）", "自动炮（共鸣）"],
            scenes: [],
            currentScene: {
                skillList: [],
                condition: {
                    health: 0,
                    targetHealth:1,
                    burstStatus:false,
                },
                results: [],
            },
            dialogVisible: false,
            formData: {},
            rules: {
                name: [{ required: true, message: '请输入技能名称', trigger: 'blur' }],
                damage: [{ required: true, message: '请输入技能伤害', trigger: 'blur' }],
                damageAfterBurst: [{ required: true, message: '请输入调律爆裂后技能伤害', trigger: 'blur' }],
                type: [{ required: true, message: '请选择技能类型', trigger: 'blur' }],
                count: [{ required: true, message: '请输入', trigger: 'blur' }],
                maxCount: [{ required: true, message: '请输入', trigger: 'blur' }],
                maxTotalCount: [{ required: true, message: '请输入', trigger: 'blur' }],
                autoDamageCount: [{ required: true, message: '请输入', trigger: 'blur' }],
                autoDamageTriggerCount: [{ required: true, message: '请输入', trigger: 'blur' }],
            },
            formDisabled: true,
            calcing: false,
            percentage: 0,
            resultDialog:false,
            currentPath:[],
        }
    },
    computed:{
    },
    mounted() {
        if (window.localStorage.getItem('skillList')) {
            this.currentScene.skillList = JSON.parse(window.localStorage.getItem('skillList'))
        }
        if (window.localStorage.getItem('condition')) {
            this.currentScene.condition = JSON.parse(window.localStorage.getItem('condition'))
        }
    },
    methods: {
        format(val){
            return val.toString().replace(/\B(?=(\d{3})+$)/g,',')
        },
        numberFormat (row, column, cellValue) {
            cellValue += ''
            if (!cellValue.includes('.')) cellValue += '.'
            return cellValue.replace(/(\d)(?=(\d{3})+\.)/g, function ($0, $1) {
              return $1 + ','
            }).replace(/\.$/, '')
        },
        skillNameFormat (row, column, cellValue){
            // console.log(row)
            let skill=this.currentScene.skillList.find(item=>{return item.id==cellValue})
            return skill?skill.name:""
        },
        importSkills(){
            navigator.clipboard.readText()
                .then(text => {
                    let data=JSON.parse(text)
                    if(!data.skillList||!data.condition){
                        console.error('无法获取或解析剪切板内容');
                        return;
                    }
                    this.currentScene={...this.currentScene,...data}
                })
                .catch(err => {
                    console.error('无法获取或解析剪切板内容:', err);
                });
        },
        exportSkills(){
            navigator.clipboard.writeText(JSON.stringify({skillList:this.currentScene.skillList,condition:this.currentScene.condition}))
        },
        viewSkill(row) {
            this.formData = row
            this.formDisabled = true
            this.dialogVisible = true
        },
        editSkill(row) {
            this.formData = JSON.parse(JSON.stringify(row))
            this.formDisabled = false
            this.dialogVisible = true
        },
        delSkill(row, index) {
            this.currentScene.skillList.splice(index, 1);
        },
        addSkill() {
            this.formData = new skill()
            this.formDisabled = false
            this.dialogVisible = true
        },
        submitForm() {
            this.$refs["form"].validate((valid) => {
                if (valid) {
                    let index = this.currentScene.skillList.findIndex(item => { return item.id == this.formData.id })
                    if (index != -1) {
                        console.log(JSON.stringify(this.formData))
                        this.currentScene.skillList[index] = this.formData
                        console.log(JSON.stringify(this.currentScene.skillList))
                    } else {
                        this.currentScene.skillList.push(this.formData)
                    }
                    this.dialogVisible = false
                } else {
                    return false;
                }
            });
        },
        startCalc() {
            window.localStorage.setItem('skillList', JSON.stringify(this.currentScene.skillList));
            window.localStorage.setItem('condition', JSON.stringify(this.currentScene.condition));
            work.postMessage({ method: "startCalc", data: this.currentScene })
            this.calcing=true
            work.onmessage = (e) => {
                let data = e.data
                switch (data.method) {
                    case 'percentageUpdate':
                        this.percentageUpdate(data.data.percentage)
                        break;
                    case 'calcComplete':
                        this.currentScene.results = data.data
                        this.calcing=false
                        break;
                    default:
                        console.log();
                }
            }
        },
        percentageUpdate(percentage){
            this.percentage = Number(percentage)
        },
        viewResult(singleResult) {
            this.currentPath=singleResult.currentPath
            this.resultDialog=true
        }
    },
})
