import React from 'react';
import { Layout, Card, Typography, Button } from 'antd';
import { redirectToHostedUI } from '../services/authService';
import styles from './LoginPage.module.css';

const { Content } = Layout;
const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const handleLogin = () => {
    redirectToHostedUI();
  };

  return (
    <Layout className={styles.layout}>
      <Content className={styles.content}>
        <Card className={styles.loginCard}>
          <div className={styles.header}>
            <img
              src="/img/RMO_Logo.png"
              alt="RMO Logo"
              className={styles.logo}
            />
            <Title level={3}>RMO Dashboard</Title>
            <Text type="secondary">Road Management Office Analytics</Text>
          </div>
          <Button
            type="primary"
            size="large"
            block
            onClick={handleLogin}
            className={styles.loginButton}
          >
            Sign in with Corporate Account
          </Button>
        </Card>
      </Content>
    </Layout>
  );
};

export default LoginPage;
