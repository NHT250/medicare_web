import React from "react";
import { Link } from "react-router-dom";

const Forbidden = () => (
  <div className="container py-5">
    <div className="row justify-content-center">
      <div className="col-md-8 text-center">
        <h1 className="display-4 fw-bold text-danger">403</h1>
        <p className="lead">You do not have permission to access this page.</p>
        <p className="text-muted">
          Please ensure you are logged in with an administrator account or return to the homepage.
        </p>
        <Link className="btn btn-primary" to="/">
          Go to Homepage
        </Link>
      </div>
    </div>
  </div>
);

export default Forbidden;
