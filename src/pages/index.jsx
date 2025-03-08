import Layout from "./Layout.jsx";

import ApiTester from "./ApiTester";

import ApiMonitoring from "./ApiMonitoring";

import ApiAnalytics from "./ApiAnalytics";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    ApiTester: ApiTester,
    
    ApiMonitoring: ApiMonitoring,
    
    ApiAnalytics: ApiAnalytics,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<ApiTester />} />
                
                
                <Route path="/ApiTester" element={<ApiTester />} />
                
                <Route path="/ApiMonitoring" element={<ApiMonitoring />} />
                
                <Route path="/ApiAnalytics" element={<ApiAnalytics />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}