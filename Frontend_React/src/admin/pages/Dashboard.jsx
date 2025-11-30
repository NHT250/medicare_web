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

const normalizeSummary = (raw) => {
  const src = raw?.data ?? raw ?? {};
  return {
    totalRevenue: src.totalRevenue ?? src.total_revenue ?? 0,
    totalOrders: src.totalOrders ?? src.total_orders ?? 0,
    totalUsers: src.totalUsers ?? src.total_users ?? 0,
    activeProducts: src.activeProducts ?? src.active_products ?? 0,
  };
};

const normalizeList = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
};

const normalizeStatusSummary = (raw) => {
  if (Array.isArray(raw)) {
    return raw.reduce((acc, item) => {
      if (!item) return acc;
      const key = (item.status || item._id || "UNKNOWN").toString().toUpperCase();
      acc[key] = Number(item.count || 0);
      return acc;
    }, {});
  }
  if (raw && typeof raw === "object") {
    return raw;
  }
  return { PENDING: 0, CONFIRMED: 0, DELIVERED: 0, CANCELLED: 0 };
};

const Dashboard = () => {
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalUsers: 0,
    activeProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [revenueSeries, setRevenueSeries] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [paymentStats, setPaymentStats] = useState([]);
  const [statusSummary, setStatusSummary] = useState({
    PENDING: 0,
    CONFIRMED: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, o, u, r, c, p, st] = await Promise.all([
          adminApi.dashboard.summary(),
          adminApi.dashboard.recentOrders(),
          adminApi.dashboard.recentUsers(),
          adminApi.dashboard.revenue(),
          adminApi.dashboard.categoryStats(),
          adminApi.dashboard.paymentMethods(),
          adminApi.dashboard.orderStatusSummary(),
        ]);
        setSummary(normalizeSummary(s));
        setRecentOrders(normalizeList(o));
        setRecentUsers(normalizeList(u));
        setRevenueSeries(normalizeList(r));
        setCategoryStats(normalizeList(c));
        setPaymentStats(normalizeList(p));
        setStatusSummary(normalizeStatusSummary(st?.data ?? st ?? {}));
        setError(null);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
        setError("Khong the tai du lieu tong quan.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

  if (loading) {
    return (
      <Container fluid className="py-3">
        <h2 className="mb-3">Tong quan he thong</h2>
        <p>Dang tai...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-3">
      <h2 className="mb-3">Tong quan he thong</h2>
      {error && <div className="alert alert-warning">{error}</div>}
      <Row>
        <SummaryCard label="Tong doanh thu" value={formatCurrency(summary.totalRevenue)} />
        <SummaryCard label="Don hang" value={summary.totalOrders || 0} />
        <SummaryCard label="Nguoi dung" value={summary.totalUsers || 0} />
        <SummaryCard label="San pham dang ban" value={summary.activeProducts || 0} />
      </Row>

      <Row className="mt-3">
        <Col lg={8} className="mb-3">
          <Card className="shadow-sm">
            <Card.Header>Don hang gan day</Card.Header>
            <Card.Body className="p-0">
              <Table striped hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>Ma don</th>
                    <th>Khach hang</th>
                    <th>Trang thai</th>
                    <th>Tong</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-3 text-muted">
                        Chua co don hang gan day
                      </td>
                    </tr>
                  )}
                  {recentOrders.map((order, idx) => (
                    <tr key={order.id || order.orderCode || idx}>
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
            <Card.Header>Nguoi dung gan day</Card.Header>
            <Card.Body>
              {recentUsers.length === 0 && <div className="text-muted">Chua co nguoi dung moi</div>}
              {recentUsers.map((user, idx) => (
                <div key={user.id || user.email || idx} className="mb-3">
                  <div className="fw-semibold">{user.name}</div>
                  <div className="text-muted small">{user.email}</div>
                  {user.totalOrders !== undefined && (
                    <div className="small">
                      Don: {user.totalOrders} | Da chi: {formatCurrency(user.totalSpent || 0)}
                    </div>
                  )}
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-3">
        <Col md={6} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Header>Doanh thu (gan nhat)</Card.Header>
            <Card.Body>
              {revenueSeries.length === 0 && <div className="text-muted">Chua co du lieu doanh thu</div>}
              {revenueSeries.map((row) => (
                <div key={row.date} className="d-flex justify-content-between border-bottom py-1">
                  <span>{row.date}</span>
                  <span>
                    {formatCurrency(row.revenue)} ({row.orders} don)
                  </span>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Header>Trang thai don hang</Card.Header>
            <Card.Body>
              {Object.keys(statusSummary).length === 0 && <div className="text-muted">Chua co du lieu</div>}
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
            <Card.Header>Thong ke danh muc</Card.Header>
            <Card.Body>
              {categoryStats.length === 0 && <div className="text-muted">Chua co du lieu</div>}
              {categoryStats.map((row, idx) => (
                <div
                  key={row.categoryId || row.categoryName || idx}
                  className="d-flex justify-content-between border-bottom py-1"
                >
                  <span>{row.categoryName}</span>
                  <span>
                    {formatCurrency(row.totalRevenue)} / SL {row.totalQuantity}
                  </span>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Header>Phuong thuc thanh toan</Card.Header>
            <Card.Body>
              {paymentStats.length === 0 && <div className="text-muted">Chua co du lieu</div>}
              {paymentStats.map((row, idx) => (
                <div key={row.method || idx} className="d-flex justify-content-between border-bottom py-1">
                  <span>{row.method}</span>
                  <span>
                    {row.orders} don — {formatCurrency(row.revenue)}
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
