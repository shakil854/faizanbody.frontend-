import React from 'react';
import { Folder, FolderGit2, FileCode, Check } from 'lucide-react';

export const StructureViewer = () => {
  return (
    <div className="structure-grid">
      {/* Backend Structure */}
      <div className="structure-card">
        <div className="structure-card-header">
          <FolderGit2 className="card-icon backend-icon" size={20} />
          <div>
            <h4>Backend (Node.js + Express)</h4>
            <span className="structure-path">faizanbody.backend/</span>
          </div>
        </div>

        <ul className="file-tree">
          <li className="folder">
            <Folder size={14} /> <span>src/</span>
            <ul>
              <li className="folder">
                <Folder size={14} /> <span>config/</span> <span className="tag">env.js, db.js</span>
              </li>
              <li className="folder">
                <Folder size={14} /> <span>controllers/</span> <span className="tag">health, sample</span>
              </li>
              <li className="folder">
                <Folder size={14} /> <span>services/</span> <span className="tag">business logic</span>
              </li>
              <li className="folder">
                <Folder size={14} /> <span>routes/</span> <span className="tag">index, health, sample</span>
              </li>
              <li className="folder">
                <Folder size={14} /> <span>middlewares/</span> <span className="tag">error, notFound</span>
              </li>
              <li className="folder">
                <Folder size={14} /> <span>utils/</span> <span className="tag">apiResponse, apiError</span>
              </li>
              <li className="file">
                <FileCode size={14} /> <span>app.js</span> <span className="tag">express setup</span>
              </li>
              <li className="file">
                <FileCode size={14} /> <span>server.js</span> <span className="tag">entry point</span>
              </li>
            </ul>
          </li>
          <li className="file">
            <FileCode size={14} /> <span>.env</span> & <span>.env.example</span>
          </li>
        </ul>
      </div>

      {/* Frontend Structure */}
      <div className="structure-card">
        <div className="structure-card-header">
          <FolderGit2 className="card-icon frontend-icon" size={20} />
          <div>
            <h4>Frontend (Vite + React)</h4>
            <span className="structure-path">faizanbody.frontend-/</span>
          </div>
        </div>

        <ul className="file-tree">
          <li className="folder">
            <Folder size={14} /> <span>src/</span>
            <ul>
              <li className="folder highlight">
                <Folder size={14} /> <strong>api/</strong> <span className="tag highlight-tag">axiosInstance.js, endpoints.js</span>
              </li>
              <li className="folder">
                <Folder size={14} /> <span>config/</span> <span className="tag">api.config.js</span>
              </li>
              <li className="folder">
                <Folder size={14} /> <span>services/</span> <span className="tag">healthService, sampleService</span>
              </li>
              <li className="folder">
                <Folder size={14} /> <span>components/</span> <span className="tag">Navbar, ApiTester, etc.</span>
              </li>
              <li className="file">
                <FileCode size={14} /> <span>App.jsx</span> & <span>main.jsx</span>
              </li>
            </ul>
          </li>
          <li className="file highlight">
            <FileCode size={14} /> <strong>.env</strong> <span className="tag highlight-tag">VITE_API_BASE_URL</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
