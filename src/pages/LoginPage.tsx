import React from 'react';
import { Card, Form, Input, Button, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import styles from './LoginPage.module.css';

const { Title, Text } = Typography;

export const LoginPage: React.FC = () => {
  const setAuthenticated = useAnalyticsStore((state) => state.setAuthenticated);

  const onFinish = (values: any) => {
    console.log('Login attempt with:', values);
    // In bypass mode, any login attempt is successful.
    // Later, this will be replaced with an `Amplify.Auth.signIn()` call.
    setAuthenticated(true);
  };

  return (
    <div className={styles.loginContainer}>
      <Card className={styles.loginCard}>
        <Space direction="vertical" align="center" style={{ width: '100%' }}>
          <Title level={2}>RMO Dashboard</Title>
          <Text type="secondary">Please sign in to continue</Text>
        </Space>

        <Form
          name="normal_login"
          className={styles.loginForm}
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your Username!' }]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder="Username"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input
              prefix={<LockOutlined className="site-form-item-icon" />}
              type="password"
              placeholder="Password"
            />
          </Form.Item>
          
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className={styles.loginFormButton}
              icon={<LoginOutlined />}
            >
              Log in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};