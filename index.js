/**
 * Vue 基类 
 * 通过 new Vue({})进行实例化 实例化时需要传入一个对象(options)
 * options 需要包含指定 DOM 元素以及需要绑定的数据(data)
 * 在 Vue 实例化的时候, 需要完成数据绑定与模板编译
 */
class Vue {
  constructor(options) {
    this.$el = document.querySelector(options.el)
    this.$data = options.data
    observe(this.$data) // 数据绑定
    proxy(this, options) // 代理
    compile(this.$el, this.$data) // 模板编译
  }
}

/**
 * observe 响应式系统(目前只针对对象)
 * 需要对 data 中所有数据进行绑定
 * 需要遍历, 先判断是否是对象, 然后将对象每一个属性进行监听(defineReactive)
 */

function observe(data) {
  if (Object.prototype.toString.call(data) === '[object Object]') {
    Object.keys(data).forEach(key => {
      defineReactive(data, key, data[key]) // 劫持侦听
      observe(data[key]) // 递归 
    })
  }
}

/**
 * 将指定对象属性进行劫持侦听
 * 劫持过程中需要判定, 如果新数据也是一个对象, 就需要继续观察侦听
 * 通过依赖关系类(Dep) 通知有依赖关系的代理做出反应
 */
function defineReactive(obj, key, val) {
  // dep 是依赖于此数据的 watcher 集合
  const dep = new Dep() // 每一个数据(被观察者)新建一个依赖集合(观察者对象)
  Object.defineProperty(obj, key, {
    get() {
      Dep.target && dep.addSub(Dep.target) // 数据初始化时候就需要建立依赖关系
      return val
    },
    set(newVal) {
      if (newVal === val) return
      val = newVal
      observe(newVal) // 新的值如果是对象也要进行观察
      dep.notify() // 通知依赖(观察者)的代理做一些事情
    }
  })
}

/**
 * Dep 是一个依赖关系存储器-发布订阅
 * 使用 Set 可以保证没有重复值
 */
class Dep {
  constructor() {
    this.subs = new Set()
  }
  // 添加订阅者
  addSub(watcher) {
    this.subs.add(watcher)
  }
  // 删除订阅者
  removeSub(watcher) {
    this.subs.delete(watcher)
  }
  // 通知订阅者
  notify() {
    for (let sub of this.subs) {
      sub.update() // watcher 需要提供的一个核心方法
    }
  }
}
Dep.target = null // 为了在 observe 中能获取到

/**
 * Compiler 模板编译系统
 * 得到 HTML 模板与 DATA
 * 获取 el 下的所有子节点 1:元素节点 3:文字节点
 * 对文字节点进行编译
 */
function compile(el, data) {
  [].slice.call(el.childNodes).forEach(node => {
    if (node.nodeType === 1) {
      compile(node) // 递归
    } else if (node.nodeType === 3) {
      compileText(node, data) // 文本编译
    }
  })
}

/**
 * 解析表达式模板 ({{ message }})
 * 得到一个需要更新的文本节点
 */
function compileText(node, data) {
  let exp = textToExp(node.textContent) // 得到一个节点
  new Watcher(exp, data, (newVal) => {
    node.textContent = newVal
  })
}

/**
 * 根据模板, 将内容根据表达式进行处理-目前只处理插值表达式
 * 提取插值表达式({{}}), 替换成指定格式
 */
function textToExp(text) {
  let fragments = text.split(/({{.+?}})/g)
  fragments = fragments.map(fragment => {
    if (fragment.match(/{{.+?}}/g)) {
      fragment = '(' + fragment.replace(/^{{|}}$/g, '') + ')'
    } else {
      fragment = '`' + fragment.replace(/`/g, '\\`') + '`'
    }
    return fragment
  })
  return fragments.join('+')
}

/**
 * Watcher
 * update 方法
 */
class Watcher {
  constructor(exp, data, callback) {
    this.oldVal = null // 初始值
    this.getter = expToFunc(exp, data) // 每次获取新的值
    this.callback = callback
    this.update()
  }
  // 为了在
  get() {
    Dep.target = this
    let value = this.getter()
    Dep.target = null
    return value
  }
  update() {
    let newVal = this.get()
    if (newVal === this.oldVal) return // 节省 DOM 操作
    this.oldVal = newVal // 复位
    this.callback && this.callback(newVal)
  }
}

/**
 * expToFunc
 * 将 exp 变成一个可执行的 function
 * 将 data 绑定到上下文 this
 */

function expToFunc(exp, data) {
  return new Function('with(this){return ' + exp + '}').bind(data)
}


/**
 * Proxy 代理
 * this.$data.count --> this.count
 */
function proxy(vueInstance, options) {
  for (const prop in options.data) {
    Object.defineProperty(vueInstance, prop, {
      get() {
        return vueInstance.$data[prop]
      },
      set(newVal) {
        vueInstance.$data[prop] = newVal
      }
    })
  }
}