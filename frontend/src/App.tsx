import type { JSX } from 'react'
import { WishForecast } from './wishes/WishForecast'

function App(): JSX.Element {
  return (
    <main>
      <h1>HoYo Toolkit</h1>
      <WishForecast />
      <footer>Fan project. Not affiliated with HoYoverse.</footer>
    </main>
  )
}

export default App
