class Component{
    constructor(opts = {}) {
        this.options = opts;
        this.$wrap = $(this.options.wrap);
        this.selector = this.options.selector;
        this.realshowTime = this.options.realshowTime;
        this.min = this.options.min;
        this.monitorStore = this.options.monitorStore;
        this.keyList = [];
        this.lastData = [];
        this.transTimer = null;
    }
}
class Monitor extends Component {
    constructor(opts = {}) {
        super(opts);
    }

    run () {

        if (!Object.keys(this.monitorStore).length) {
            return;
        }

        // 定时检查可视区内
        this.intervalLookup();

        // 定时发送log
        this.intervalTrans();
    }

    updateMonitorStore (obj) {
        if (Object.keys(obj).length) {
            this.monitorStore = obj;
        }
    }

    intervalLookup () {
        setTimeout(() => {
            const $items = this.lookupEls();
            const diff = this.getArrDiff(this.lastData, $items);
            diff.forEach((el)=> {
                this.collectKey($(el), 'isReset');
            });
            this.lastData = $items;

            this.setTimeStamp($items);	
            this.intervalLookup();
        }, 200);
    }

    intervalTrans () {
        setTimeout(() => {
            this.timingTrans();
            this.intervalTrans();
        }, 500);
    }

    lookupEls () {
        const $items = this.getSelectorEls();
        const dis = this.computedDis();
        const { startIndex, endIndex } = this.computedIndex(dis);
        
        return $items.toArray()
            .slice(startIndex, endIndex)
            .filter(
                el => this.isVisualArea($(el))
            );
    }

    getSelectorEls () {
        return this.$wrap.find(this.selector);
    }

    getArrDiff (arr1, arr2) {
        return arr1.filter(item => arr2.indexOf(item) < 0)
    }

    /**
     * 设置时间戳，用来计算realshow time
     */
    setTimeStamp ($items) {
        $items.forEach((el, index) => {
            const $el = $(el);
            const { key } = $el.data();
            const { sTime, eTime } = this.monitorStore[key]['realtime'];
            const fTime = sTime ? 'eTime' : 'sTime';
            
            this.collectKey($el);
            this.setTime(key, fTime);
        });
    }

    alreadySend (key) {
        this.monitorStore[key]['isSendout'] = 1;
    }

    setTime (key, fTime) {
        const curTime = new Date().getTime();
        this.monitorStore[key]['realtime'][fTime] = curTime;
    }

    resetTime (key) {
        this.monitorStore[key]['realtime']['sTime'] = 0;
        this.monitorStore[key]['realtime']['eTime'] = 0;
    }

    /**
     * 收集需要打点的数据
     */
    collectKey ($el, isReset) {
        const { key } = $el.data();
        const { sTime, eTime } = this.monitorStore[key]['realtime'];
        const realshowTime = eTime - sTime;
        
        // 如果符合收集条件，直接收集日志
        if (realshowTime >= this.realshowTime && !this.monitorStore[key]['isSendout']) {
            this.keyList.push(key);
            this.alreadySend(key);
        }
        
        // 如果不符合，看是否要重置之前的时间戳,场景为先进入可视区域，再离开可视区域
        if (isReset === 'isReset') {
            this.resetTime(key);
        }
    }

    /**
     * 发送log，一次最多发10条
     */
    timingTrans () {
        const logArr = this.keyList.splice(0, 10);
        if (logArr.length) {
            console.log(`本次发送日志为: ${JSON.stringify(logArr)}`);
        }
    }

    isVisualArea ($el) {
        const scrollTop = $(window).scrollTop();
        const windowHeight = $(window).height();
        const offsetTop = $el.offset().top;
        return offsetTop < scrollTop + windowHeight 
            && offsetTop + $el.height() > scrollTop;
    }

    computedIndex (dis) {
        const startIndex = dis.minDis.tentTop / this.min;
        const endIndex = dis.maxDis / this.min;
        return {
            startIndex,
            endIndex
        }
    }

    computedDis () {
        const dis = $(window).scrollTop() - this.$wrap.offset().top;
        return {
            minDis: dis,
            maxDis: dis + $(window).height()
        };
    }
}