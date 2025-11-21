# AI Calling Agent Dashboard

A modern, professional dashboard for managing AI-driven outbound calling campaigns.

## 🚀 Features

- **Dark/Light Mode**: Toggle between themes
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Analytics**: Charts and metrics for campaign performance
- **Campaign Management**: Create, edit, pause, and monitor campaigns
- **AI Agent Studio**: Configure and manage AI calling agents
- **Detailed Call Logs**: Track every call with detailed analytics

## 📦 Installation

```bash
cd frontend
npm install
```

## 🏃 Running the Application

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dashboard will be available at `http://localhost:3001`

## 🎨 Tech Stack

- **React 18**: UI framework
- **Tailwind CSS**: Styling
- **Recharts**: Data visualization
- **React Router**: Navigation
- **React Icons**: Icon library

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── DashboardOverview.jsx
│   │   ├── Campaigns.jsx
│   │   ├── AIAgents.jsx
│   │   ├── Analytics.jsx
│   │   └── Settings.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
└── package.json
```

## 🔧 Configuration

The dashboard connects to the backend API at `http://localhost:3000` (configured in `vite.config.js`).

## 🎯 Key Sections

1. **Dashboard**: Overview with KPIs, live campaigns, and charts
2. **Campaigns**: Create and manage calling campaigns
3. **AI Agents**: Configure AI calling agents
4. **Analytics**: Detailed reports and call logs
5. **Settings**: Account and API configuration

## 🌙 Dark Mode

Dark mode is enabled by default. Toggle it using the button in the sidebar footer.

## 📱 Responsive Design

The dashboard is fully responsive and adapts to:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

