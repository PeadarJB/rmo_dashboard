import React from 'react';
import { Layout, Card, Typography } from 'antd';
import styles from './LoginPage.module.css';

const { Content } = Layout;
const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  // NOTE: All previous state, navigation, and form handling logic has been removed.
  // This component will be updated in the next phase to handle the redirect
  // to the Cognito Hosted UI.

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
          {/* The login form is removed. A new "Sign In" button will be added here. */}
        </Card>
      </Content>
    </Layout>
  );
};

export default LoginPage;
