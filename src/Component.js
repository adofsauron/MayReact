import {
    reRender
} from './MayDom';
import {
    mayQueue,
    mergeState
} from './util';


export function Component(props, key, ref, context) {
    this.props = props;
    this.key = key;
    this.ref = ref;
    this.context = context;
}

Component.prototype.setState = function (state, callback) {
    var lifeState = this._lifeState;

    if (callback) {
        //回调队列调用之前也许sort
        callback = callback.bind(this);
        callback._mountOrder = this._mountOrder;
        mayQueue.callbackQueue.push(callback);
    }
    if (this._mergeStateQueue) {
        this._mergeStateQueue.push(state);
    } else {
        this._mergeStateQueue = new Array(state);
    }
    if (mayQueue.isInEvent) {
        //如果在绑定事件中 触发setState合并state
        if (mayQueue.dirtyComponentsQueue.indexOf(this) === -1) {
            this._dirty = true;
            mayQueue.dirtyComponentsQueue.push(this);
        }
        return;
    }
    switch (lifeState) {
        case 'beforeComponentWillUnmount': //componentWillUnmount 触发setState忽略
            return;
        case 'beforeComponentWillMount': //componentWillMount 触发setState会合并state
            this.state = mergeState(this);
            return;
        case 'beforeComponentRerender': //子组件componentWillReceiveProps 调用父组件的setState 触发setState会放到下一周期
            this._renderInNextCycle = true;
        case 'afterComponentWillMount': //子组件在ComponentWillMount中调用父组件的setState
        case 'beforeComponentDidMount': //componentDidMount 触发setState会放到下一周期beforeComponentRerender
            if (mayQueue.dirtyComponentsQueue.indexOf(this) === -1) {
                this._dirty = true;
                mayQueue.dirtyComponentsQueue.push(this);
            }
            return;
        default:
            if (mayQueue.dirtyComponentsQueue.indexOf(this) === -1) {
                this._dirty = true;
                mayQueue.dirtyComponentsQueue.push(this);
            }
            break;
    }

    mayQueue.clearQueue();
}
Component.prototype.forceUpdate = function (callback) {
    if (callback) {
        mayQueue.callbackQueue.push(callback.bind(this));
    }
    if (mayQueue.dirtyComponentsQueue.indexOf(this) === -1) {
        this._forceUpdate = true;
        this._dirty = true;
        mayQueue.dirtyComponentsQueue.push(this);
    }
    var lifeState = this._lifeState;
    switch (lifeState) {
        case 'beforeComponentWillUnmount': //componentWillUnmount 触发forceUpdate
        case 'beforeComponentWillMount': //componentWillMount 触发forceUpdate会合并state
        case 'beforeComponentRerender': //子组件componentWillReceiveProps 触发forceUpdate
        case 'afterComponentWillMount': //子组件在ComponentWillMount中触发forceUpdate
        case 'beforeComponentDidMount': //componentDidMount 触发forceUpdate
            return;
        default:
            mayQueue.clearQueue();
            break;
    }

}
Component.prototype.isMounted = function () {
    return (!!(this._renderedVnode && this._renderedVnode._hostNode || this._hostNode)) || false;
}