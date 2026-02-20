import React from "react";

const NotFound = () => {
    return (
        <main className="app-shell">
            <section className="panel not-found-panel">
                <p className="page-kicker">Error</p>
                <h1 className="page-title">404 - Not Found</h1>
                <p className="page-subtitle">The page you are looking for does not exist.</p>
            </section>
        </main>
    );
};

export default NotFound;
