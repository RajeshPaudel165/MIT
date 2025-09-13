# 🌱 Soil Savvy Suite - Tech Stack Documentation

A comprehensive smart agriculture platform combining IoT soil monitoring, AI-powered plant identification, and intelligent garden management.

## 📋 Table of Contents
- [System Architecture](#system-architecture)
- [Frontend Stack](#frontend-stack)
- [Backend Stack](#backend-stack)
- [AI & ML Services](#ai--ml-services)
- [Database & Storage](#database--storage)
- [Development Tools](#development-tools)
- [Deployment & Infrastructure](#deployment--infrastructure)
- [External APIs & Services](#external-apis--services)
- [Security & Authentication](#security--authentication)
- [Monitoring & Analytics](#monitoring--analytics)

## 🏗️ System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Services   │
│   React + Vite  │◄──►│   Flask API     │◄──►│   Claude AI     │
│   TypeScript    │    │   Python        │    │   PlantNet API  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Firebase      │    │   IoT Sensors   │    │   Notifications │
│   Auth & DB     │    │   Soil Monitor  │    │   Email & SMS   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Components
- **Frontend**: Single Page Application (SPA) with real-time dashboards
- **Backend**: RESTful API with automated monitoring systems
- **AI Layer**: Multi-model approach for plant identification and chat assistance
- **IoT Integration**: Real-time soil sensor data collection and analysis
- **Cloud Services**: Firebase for authentication, database, and file storage

## 🎨 Frontend Stack

### Core Framework
- **React 18.3.1** - Component-based UI library with latest features
- **TypeScript 5.8.3** - Type-safe JavaScript for better developer experience
- **Vite 5.4.19** - Lightning-fast build tool and dev server

### UI Framework & Design System
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **shadcn/ui** - Modern component library built on Radix UI
- **Radix UI Primitives** - Unstyled, accessible UI components
  - Form controls, navigation, overlays, and data display components
- **Lucide React** - Beautiful icon library with 460+ icons

### State Management & Data Fetching
- **React Query (TanStack) 5.83.0** - Server state management and caching
- **React Hook Form 7.61.1** - Performant forms with validation
- **React Router DOM 6.30.1** - Client-side routing and navigation

### Charts & Visualizations
- **Recharts 2.15.4** - Composable charting library for React
- **Custom Gauge Components** - Real-time soil data visualization
- **Interactive Dashboards** - Live sensor data and plant analytics

### Additional Libraries
- **Date-fns 3.6.0** - Modern date utility library
- **Zod 3.25.76** - TypeScript-first schema validation
- **Class Variance Authority** - Type-safe utility classes
- **CLSX & Tailwind Merge** - Conditional class name utilities

## ⚙️ Backend Stack

### Core Framework
- **Flask 3.0.3** - Lightweight Python web framework
- **Flask-CORS 4.0.1** - Cross-origin resource sharing support
- **Python 3.9+** - Modern Python with async/await support

### Environment & Configuration
- **python-dotenv 1.0.1** - Environment variable management
- **Config Management** - Centralized application configuration

### Specialized Modules
```python
# Core monitoring modules
├── app.py                 # Main Flask application
├── automatic_monitoring.py # Automated soil monitoring system
├── weather_monitor.py     # Weather data integration
├── casual_mode.py        # Relaxed monitoring mode
├── entertainment_mode.py # Gamified plant care
└── outdoor_mode.py       # Outdoor plant monitoring
```

### Real-time Features
- **Automated Monitoring** - 300-second interval sensor checks
- **Threshold-based Alerts** - Critical condition detection
- **Multi-mode Operations** - Different monitoring profiles

## 🤖 AI & ML Services

### Large Language Models
- **Anthropic Claude** - Primary chatbot and plant analysis
  - Model: `claude-3-5-haiku-20241022`
  - Features: Vision analysis, contextual conversations
  - Integration: `@anthropic-ai/sdk 0.62.0`

- **Google Gemini** - Secondary AI service
  - Integration: `@google/generative-ai 0.24.1`
  - Backup and comparative analysis

### Plant Identification Services
- **Claude Vision AI** - Advanced image analysis
  - High-confidence plant identification
  - Detailed care instructions and characteristics
  - Fallback mechanism for failed identifications

- **PlantNet API** - Scientific botanical database
  - Academic-grade plant identification
  - Scientific name resolution
  - Observation data from global community

### AI Features
- **Contextual Chat** - Personalized garden advice using real soil data
- **Plant Analysis** - Species identification with confidence scoring
- **Smart Recommendations** - Care tips based on current conditions
- **Multi-modal Input** - Text and image processing capabilities

## 🗄️ Database & Storage

### Firebase Ecosystem
- **Firebase Authentication** - User management and security
- **Cloud Firestore** - NoSQL document database
  - Real-time synchronization
  - Offline support
  - Scalable document storage

### Data Structure
```
users/{userId}/
├── profile/           # User profile data
├── plants/{plantId}   # User's plant collection
├── soil_data/         # Historical sensor readings
├── notifications/     # Alert preferences
└── settings/          # App configuration
```

### Storage Services
- **Firebase Storage** - Image and file storage
- **Local Storage** - Browser-based caching
- **Session Storage** - Temporary data management

## 🛠️ Development Tools

### Build & Development
- **Concurrently 9.2.1** - Run multiple commands simultaneously
- **Vite Plugin React SWC** - Fast React compilation
- **TypeScript ESLint** - Code quality and consistency

### Code Quality
- **ESLint 9.32.0** - JavaScript/TypeScript linting
- **Prettier** (via editor config) - Code formatting
- **Husky** - Git hooks for quality gates

### Package Management
- **npm** - Node.js package manager
- **pip** - Python package installer

## 🚀 Deployment & Infrastructure

### Development Environment
```bash
# Frontend development server
npm run dev          # Starts Vite dev server on :8080

# Backend development server
./start-backend.sh   # Starts Flask server on :5001

# Combined development
npm run dev          # Runs both frontend and backend
```

### Build Pipeline
```bash
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build
```

### Deployment Options
- **Frontend**: Static hosting (Vercel, Netlify, Firebase Hosting)
- **Backend**: Cloud platforms (Heroku, Railway, Google Cloud Run)
- **Database**: Firebase (managed) or self-hosted alternatives

## 🔌 External APIs & Services

### Communication Services
- **Sinch SMS** - SMS notifications and alerts
  - Integration: `@sinch/sdk-core 1.3.0`
  - Multi-channel messaging support

### Plant & Weather APIs
- **PlantNet API** - Plant identification service
- **Weather APIs** - Environmental data integration
- **OpenAI API** - Additional AI capabilities

### Monitoring Services
- **Custom IoT Integration** - Soil sensor data collection
- **Real-time Alerts** - Email and SMS notifications

## 🔒 Security & Authentication

### Authentication Flow
- **Firebase Auth** - Secure user authentication
- **JWT Tokens** - Stateless session management
- **Multi-factor Authentication** - Enhanced security options

### Data Protection
- **CORS Configuration** - Cross-origin request protection
- **Environment Variables** - Sensitive data management
- **API Key Security** - Secure external service access

### Privacy Features
- **Data Encryption** - At-rest and in-transit protection
- **User Consent** - GDPR-compliant data handling
- **Audit Logging** - Security event tracking

## 📊 Monitoring & Analytics

### Application Monitoring
- **Real-time Dashboards** - Live system status
- **Error Tracking** - Automated error collection
- **Performance Metrics** - Response time and throughput

### Soil & Plant Analytics
- **Trend Analysis** - Historical data visualization
- **Predictive Insights** - AI-powered recommendations
- **Alert Systems** - Critical condition notifications

### User Analytics
- **Usage Tracking** - Feature adoption metrics
- **Plant Care Statistics** - Garden management insights
- **Performance Optimization** - Data-driven improvements

## 🎯 Key Features Enabled by Tech Stack

### Real-time Capabilities
- Live soil sensor data streaming
- Instant plant identification results
- Real-time chat assistance
- Immediate alert notifications

### AI-Powered Intelligence
- Context-aware garden advice
- Multi-method plant identification
- Predictive care recommendations
- Natural language interactions

### Cross-platform Compatibility
- Responsive web design
- Mobile-first approach
- Progressive Web App features
- Offline functionality support

### Scalable Architecture
- Microservices-ready design
- Cloud-native deployment
- Auto-scaling capabilities
- Load balancing support

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+ and pip
- Firebase project setup
- API keys for external services

### Quick Start
```bash
# Clone and setup
git clone <repository-url>
cd soil-savvy-suite

# Install dependencies
npm install
pip install -r Backend/requirements.txt

# Configure environment
cp .env.example .env
# Add your API keys and configuration

# Start development servers
npm run dev
```

### Environment Variables
```env
# AI Services
ANTHROPIC_API_KEY=your_claude_api_key
GOOGLE_API_KEY=your_gemini_api_key

# Firebase
FIREBASE_API_KEY=your_firebase_key
FIREBASE_AUTH_DOMAIN=your_domain
FIREBASE_PROJECT_ID=your_project_id

# External APIs
PLANTNET_API_KEY=your_plantnet_key
SINCH_SERVICE_PLAN_ID=your_sinch_id
SINCH_API_TOKEN=your_sinch_token
```

## 📈 Performance Optimizations

### Frontend Optimizations
- Code splitting with Vite
- Tree shaking for bundle size
- Image lazy loading
- React Query caching

### Backend Optimizations
- Async/await patterns
- Connection pooling
- Response caching
- Database indexing

### AI Service Optimizations
- Request batching
- Response caching
- Fallback mechanisms
- Rate limiting

---
# MIT
