import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import itIT from 'antd/locale/it_IT'
import { useAuthStore } from './store/authStore'
import { AppRouter } from './router/AppRouter'
import 'antd/dist/reset.css'

function Root() {
  const init = useAuthStore((s) => s.init)
  React.useEffect(() => { init() }, [init])

  return (
    <ConfigProvider
      locale={itIT}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#d4380d',
          borderRadius: 6,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      <AppRouter />
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
