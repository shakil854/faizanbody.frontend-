import React from 'react';
import { Layers, ShieldCheck, Zap, Code2, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../config/api.config';

export const ApiConfigBanner = () => {
  return (
    <section className="architecture-section">
      <div className="banner-card">
        <div className="banner-header">
          <div className="pill-tag">
            <Layers size={14} />
            <span>Senior Software Engineer Architecture</span>
          </div>
          <span className="version-pill">Axios v1.x • Vite React</span>
        </div>

        <h2 className="banner-title">
          Centralized Axios Instance Setup Ready!
        </h2>
        <p className="banner-desc">
          Frontend me <strong>ek single centralized Axios instance</strong> bana diya gaya hai.
          Aapko har page ya component me alag-alag API URLs likhne ki koi zaroorat nahi hai.
        </p>

        <div className="config-box">
          <div className="config-box-header">
            <span className="config-title">
              <Code2 size={16} /> Live API kaise badlein?
            </span>
            <span className="config-file-tag">faizanbody.frontend-/.env</span>
          </div>
          <div className="config-code">
            <pre>
{`# Bas frontend ke .env file me ye line change kardo:
VITE_API_BASE_URL=https://your-live-domain.com/api/v1

# Yaa src/config/api.config.js me default URL badal do.
# Sabhi components, services aur pages me automatically Live API hit hogi!`}
            </pre>
          </div>
        </div>

        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon"><Zap size={18} /></div>
            <div>
              <h4>Single Source of Truth</h4>
              <p>Base URL sirf ek file me configure hota hai.</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon"><ShieldCheck size={18} /></div>
            <div>
              <h4>Request Interceptors</h4>
              <p>Auth Bearer Tokens automatic add hote hain.</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon"><Layers size={18} /></div>
            <div>
              <h4>Response Interceptors</h4>
              <p>401, 403, 500 error handling centrally manage hoti hai.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
