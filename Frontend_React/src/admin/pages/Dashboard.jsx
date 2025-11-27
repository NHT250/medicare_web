import React, { useEffect, useState } from "react";
import { Card, Col, Container, Row, Table } from "react-bootstrap";
import adminApi from "../api";

const SummaryCard = ({ label, value }) => (
  <Col md={6} lg={3} className="mb-3">
    <Card className="shadow-sm h-100">
      <Card.Body>
        <p className="text-muted text-uppercase small mb-1">{label}</p>
        <h4 className="fw-bold mb-0">{value}</h4>
      </Card.Body>
    </Card>
  </Col>
);

const Dashboard = () => {
  const [summary, setSummary] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [paymentStats, setPaymentStats] = useState([]);
  const [statusSummary, setStatusSummary] = useState({});

  useEffect(() => {
    const load = async () => {
      const [s, o, u, r, c, p, st] = await Promise.all([
        adminApi.dashboard.summary(),
        adminApi.dashboard.recentOrders(),
        adminApi.dashboard.recentUsers(),
        adminApi.dashboard.revenue(),
        adminApi.dashboard.categoryStats(),
        adminApi.dashboard.paymentMethods(),
        adminApi.dashboard.orderStatusSummary(),
      ]);
      setSummary(s.data || {});
      setRecentOrders(o.data || []);
      setRecentUsers(u.data || []);
      setRevenue(r.data || []);
      setCategoryStats(c.data || []);
      setPaymentStats(p.data || []);
      setStatusSummary(st.data || {});
    };
    load();
  }, []);

  const formatCurrency = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

  return (
    <Container fluid className="py-3">
      <h2 className="mb-3">Admin Dashboard</h2>
      <Row>
        <SummaryCard label="Total Revenue" value={formatCurrency(summary.totalRevenue)} />
        <SummaryCard label="Orders" value={summary.totalOrders || 0} />
        <SummaryCard label="Users" value={summary.totalUsers || 0} />
        <SummaryCard label="Active Products" value={summary.activeProducts || 0} />
      </Row>

      <Row className="mt-3">
        <Col lg={8} className="mb-3">
          <Card className="shadow-sm">
            <Card.Header>Recent Orders</Card.Header>
            <Card.Body className="p-0">
              <Table striped hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.orderCode}</td>
                      <td>
                        <div className="fw-semibold">{order.customerName || "-"}</div>
                        <div className="text-muted small">{order.customerEmail || "-"}</div>
                      </td>
                      <td>{order.status}</td>
                      <td>{formatCurrency(order.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Header>Recent Users</Card.Header>
            <Card.Body>
              {recentUsers.map((user) => (
                <div key={user.id} className="mb-3">
                  <div className="fw-semibold">{user.name}</div>
                  <div className="text-muted small">{user.email}</div>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3">
        <Col md={6} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Header>Revenue (last range)</Card.Header>
            <Card.Body>
              {revenue.map((row) => (
                <div key={row.date} className="d-flex justify-content-between border-bottom py-1">
                  <span>{row.date}</span>
                  <span>{formatCurrency(row.revenue)}</span>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Header>Order Status</Card.Header>
            <Card.Body>
              {Object.entries(statusSummary).map(([status, count]) => (
                <div key={status} className="d-flex justify-content-between border-bottom py-1">
                  <span>{status}</span>
                  <span>{count}</span>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3">
        <Col md={6} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Header>Category Stats</Card.Header>
            <Card.Body>
              {categoryStats.map((row) => (
                <div key={row.categoryId} className="d-flex justify-content-between border-bottom py-1">
                  <span>{row.categoryName}</span>
                  <span>{formatCurrency(row.totalRevenue)} / Qty {row.totalQuantity}</span>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Header>Payment Methods</Card.Header>
            <Card.Body>
              {paymentStats.map((row) => (
                <div key={row.method || "unknown"} className="d-flex justify-content-between border-bottom py-1">
                  <span>{row.method}</span>
                  <span>
                    {row.orders} orders · {formatCurrency(row.revenue)}
                  </span>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
