import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import itIT from 'antd/locale/it_IT'
import { AppRouter } from './router/AppRouter'
import 'antd/dist/reset.css'

function Root() {
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
  <Root />
)
