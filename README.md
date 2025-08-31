# Tempo - Pomodoro Timer App

A modern Pomodoro timer application with a beautiful interface, built with React, TypeScript, Vite, and Tailwind CSS.

## ✨ Features

### 🎯 Timer Modes
- **Workday Mode**: Work for a specific duration (e.g., 8 hours)
- **Cycles Mode**: Complete a specific number of Pomodoro cycles
- **Flexible Settings**: Customize Pomodoro, short break, and long break durations

### 🎨 User Interface
- **Modern Design**: Clean, responsive interface with smooth animations
- **Theme Support**: Dark (blue) and Light (gold) themes
- **Progress Tracking**: Visual progress bars for workday and cycles
- **Schedule Preview**: See upcoming segments and remaining time

### 🔊 Voice Announcements
- **Voice Selection**: Choose between Male, Female, or System default voices
- **Specific Voice Picker**: Select from available English voices on your system
- **Volume Control**: Adjust announcement volume independently
- **Smart Fallback**: Automatic fallback to system voices if preferred voices unavailable

### 📊 Daily Diary & Statistics
- **Live Counters**: Real-time tracking of active and total hours
- **Session Records**: Detailed logs of all Pomodoro sessions
- **Profile-based Totals**: Separate statistics for different work profiles
- **Persistent Storage**: All data saved locally using localStorage

### ⚙️ Advanced Settings
- **Custom Durations**: Set Pomodoro, short break, and long break lengths
- **Break Scheduling**: Configure when long breaks occur
- **Workday Duration**: Set total work hours for the day
- **Real-time Updates**: Settings applied immediately

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)

### Installation
1. Clone the repository
   ```bash
   git clone <REPO_URL>
   cd pomodoros-app
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start development server
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

### Production Build
```bash
npm run build
npm run preview
```
Use `preview` to test the production build locally at `http://localhost:4173`.

## 🎮 How to Use

### Basic Timer Operation
1. **Choose Mode**: Select between Workday (time-based) or Cycles (count-based)
2. **Configure Settings**: Set durations for Pomodoro, breaks, and workday
3. **Start Session**: Click "Start Day" to begin your first Pomodoro
4. **Follow the Flow**: Work during Pomodoro, take short breaks, and long breaks as scheduled
5. **Monitor Progress**: Watch your progress bars and upcoming segments

### Voice Configuration
1. **Access Settings**: Go to Timer Settings
2. **Select Voice Type**: Choose Male, Female, or System
3. **Pick Specific Voice**: Select from available English voices (optional)
4. **Adjust Volume**: Set announcement volume to your preference
5. **Test Voice**: Use the "Test Voice" button to preview your selection

### Daily Diary
- **Active Hours**: Time spent in actual Pomodoro sessions
- **Total Hours**: Complete time including breaks
- **Session History**: Detailed log of all completed sessions
- **Profile Management**: Organize work by different projects or activities

## 🏗️ Project Structure

### Core Components
- `src/App.tsx`: Main application logic, timer state, and data management
- `src/components/Timer.tsx`: Timer display with countdown animation
- `src/components/TimerSettings.tsx`: User-configurable timer settings and voice options
- `src/components/WorkdayProgress.tsx`: Progress visualization for workday/cycles
- `src/components/SchedulePreview.tsx`: Upcoming segments and remaining time display
- `src/components/Diary.tsx`: Daily statistics and session records
- `src/components/WatchFace.tsx`: Timer face component

### Utilities
- `src/utils/audio.ts`: Speech synthesis, voice selection, and audio management
- `src/utils/constants.ts`: Application constants, voice options, and storage keys
- `src/utils/dates.ts`: Date formatting and time calculations
- `src/utils/haptics.ts`: Haptic feedback for mobile devices

### Configuration Files
- `tailwind.config.js`: Tailwind CSS configuration
- `tsconfig.json`: TypeScript configuration
- `vite.config.ts`: Vite build configuration
- `eslint.config.js`: ESLint rules and configuration

## 🛠️ Available Scripts

- `npm run dev`: Start Vite development server
- `npm run build`: Compile TypeScript and create production build
- `npm run preview`: Serve production build for local testing
- `npm run lint`: Run ESLint for code quality checks

## 🔧 Technical Details

### State Management
- **React Hooks**: useState, useEffect, useMemo, useCallback for component state
- **Local Storage**: Persistent data storage for settings, diary, and voice preferences
- **Custom Events**: Inter-component communication via window events

### Voice System
- **Web Speech API**: Primary speech synthesis engine
- **Voice Filtering**: Intelligent selection based on gender preference and language
- **Fallback System**: Automatic fallback to available system voices
- **Performance**: Optimized voice loading and caching

### Performance Features
- **RequestAnimationFrame**: Smooth timer animations
- **Memoization**: Optimized calculations and re-renders
- **Efficient Updates**: Minimal DOM updates during timer operation

## 🌟 Recent Updates

### Voice Selection System
- Added Male/Female/System voice options
- Implemented specific voice picker from available English voices
- Added volume control for voice announcements
- Enhanced voice filtering for deep/relaxed male voices

### UI Improvements
- Complete translation from Italian to English
- Enhanced "Next Segments" section with accurate counters
- Fixed "Total Time" calculation in schedule preview
- Improved time formatting and display

### Bug Fixes
- Resolved 2-second counter update issue in daily diary
- Fixed remaining pomodoros calculation logic
- Corrected break scheduling algorithms
- Enhanced TypeScript type safety

## 📱 Browser Support

- **Chrome**: Full support with all features
- **Firefox**: Full support with all features
- **Safari**: Full support with all features
- **Edge**: Full support with all features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:
1. Check the existing issues in the repository
2. Create a new issue with detailed description
3. Include browser version and operating system information

---

**Built with ❤️ using React, TypeScript, Vite, and Tailwind CSS**
