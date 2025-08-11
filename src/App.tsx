import './App.css';
import { DataLoaderTest } from './components/DataLoaderTest';
import { CalculationTest } from './components/CalculationTest';
import { Space } from 'antd';

function App() {
  return (
    <div className="App">
      <h1>RMO Strategic Analytics Dashboard</h1>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <DataLoaderTest />
        <CalculationTest />
      </Space>
    </div>
  );
}

export default App;