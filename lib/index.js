import path from 'path'
import http from 'http'

const CONTEXT_CONFIG = Symbol('context#config')

/**
 * 默认参数
 * [defaultConfig description]
 * @type {Object}
 */
const defaultConfig = {
  env: process.env.LONO_ENV || 'index',
  cwd: process.cwd()
}

class Config {
  constructor (opt) {
    this.name = 'config'
    this.isLono = true
    this.opts = opt ? [opt] : []
    this.config = {}
  }
  install (app) {
    if (app.context.hasOwnProperty(CONTEXT_CONFIG)) return
    // 核心注入
    this.opts.forEach((opt) => {
      const env = opt.env || defaultConfig.env
      let config
      // 读取配置文件
      if (opt.path) {
        config = require(`${opt.path}${env}`)
      // 读取配置对象
      } else if (opt.config) {
        config = opt.config
      // 读取远程地址json文件
      } else if (opt.url) {
        this.loadJSON(opt.url)
      // 读取配置中心配置
      } else if (opt.center) {
        // 设置一个等待消息，等eureka连接执行
        // if (app.$observer) {
        //   app.$observer.on(`$eureka:mounted`, () => {})
        // }
        // config = opt.config
      // 读取数据库配置
      } else {
        try {
          config = require(`${defaultConfig.cwd}/src/config/${env}`)
        } catch (e) {
          try {
            config = require(`${defaultConfig.cwd}/config/${env}`)
          } catch (e) {
            throw new Error('config file is not find')
          }
        }
      }
      this.config = (!this.config || opt.needClean === true) ? Object.assign({}, defaultConfig, config) : Object.assign(this.config, config)
    })
    Object.defineProperty(app, '$config', {
      value: this.config,
      writable: false
    })
    Object.defineProperties(app.context, {
      [CONTEXT_CONFIG]: {
        value: app.$config,
        writable: false
      },
      'config': {
        value: app.$config,
        writable: false
      }
    })
  }
  use (opt = {}) {
    opt && this.opts.push(opt)
    return this
  }
  setConfig (app, config) {
    app.$observer.emit(`$config:update`, config)
  }
  async loadJSON (url) {
    const json = await loadJSON(url)
  }
}

function loadJSON (url) {
  return new Promise(function (resolve, reject) {
    http.get(url, function(res) {
      let html = ''
      res.on('data', (data)=>{
        html += data
      })
      res.on('end', () => {
        resolve(html)
      })
      res.on('error', (e) => {
        reject(e.message)
      })
    })
  })
}

export default function (...arg) {
  return new Config(...arg)
}
