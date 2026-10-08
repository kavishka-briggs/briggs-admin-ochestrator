import Routers from './Routers';
import { listen } from './utils/logging';

listen();

const App = () => {

  return (
    <Routers />
  )
}

export default App
