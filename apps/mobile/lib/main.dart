import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'providers/app_provider.dart';
import 'theme/app_theme.dart';
import 'screens/onboarding_screen.dart';
import 'screens/clipboard_screen.dart';
import 'screens/devices_screen.dart';
import 'screens/settings_screen.dart';
import 'services/storage_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set system UI style
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: CopyCloudTheme.background,
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  
  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  
  runApp(const CopyCloudApp());
}

class CopyCloudApp extends StatelessWidget {
  const CopyCloudApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => AppProvider()..initialize(),
      child: MaterialApp(
        title: 'CopyCloud',
        debugShowCheckedModeBanner: false,
        theme: CopyCloudTheme.darkTheme,
        home: const AppNavigator(),
        routes: {
          '/onboarding': (context) => const OnboardingScreen(),
          '/settings': (context) => const SettingsScreen(),
        },
      ),
    );
  }
}

class AppNavigator extends StatelessWidget {
  const AppNavigator({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppProvider>(
      builder: (context, provider, child) {
        // Show loading state
        if (provider.state == AppState.loading) {
          return const Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Initializing...'),
                ],
              ),
            ),
          );
        }
        
        // Show error state
        if (provider.state == AppState.error) {
          return Scaffold(
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.error_outline_rounded,
                      size: 64,
                      color: CopyCloudTheme.error,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Something went wrong',
                      style: CopyCloudTheme.headingMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      provider.errorMessage ?? 'Unknown error',
                      style: CopyCloudTheme.bodyMedium.copyWith(
                        color: CopyCloudTheme.foregroundMuted,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => provider.initialize(),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          );
        }
        
        // Check if onboarding is complete
        if (!StorageService.onboardingComplete) {
          return const OnboardingScreen();
        }
        
        // Main app with bottom navigation
        return const MainScreen();
      },
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;
  
  final List<Widget> _screens = const [
    ClipboardScreen(),
    DevicesScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() => _currentIndex = index);
        },
        backgroundColor: CopyCloudTheme.surface,
        indicatorColor: CopyCloudTheme.accentOrange.withOpacity(0.2),
        destinations: [
          NavigationDestination(
            icon: Icon(
              Icons.content_paste_outlined,
              color: _currentIndex == 0
                  ? CopyCloudTheme.accentOrange
                  : CopyCloudTheme.foregroundMuted,
            ),
            selectedIcon: Icon(
              Icons.content_paste_rounded,
              color: CopyCloudTheme.accentOrange,
            ),
            label: 'Clips',
          ),
          NavigationDestination(
            icon: Icon(
              Icons.devices_outlined,
              color: _currentIndex == 1
                  ? CopyCloudTheme.accentOrange
                  : CopyCloudTheme.foregroundMuted,
            ),
            selectedIcon: Icon(
              Icons.devices_rounded,
              color: CopyCloudTheme.accentOrange,
            ),
            label: 'Devices',
          ),
        ],
      ),
    );
  }
}
