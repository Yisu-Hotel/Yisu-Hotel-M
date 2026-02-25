
import { useLaunch } from '@tarojs/taro'
import { mockLogin } from './services/api'

import './app.less'

function App({ children }) {
  useLaunch(async () => {
    console.log('App launched.')
    // 自动获取测试token
    const loginSuccess = await mockLogin()
    console.log('Mock login result:', loginSuccess)
  })

  // children 是将要会渲染的页面
  return children
}


export default App
