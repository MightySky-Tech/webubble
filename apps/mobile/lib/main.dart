import 'package:flutter/material.dart';

/// The API base URL is injected at build time, e.g.
/// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8100/api/v1`.
const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:8100/api/v1',
);

void main() {
  runApp(const WebubbleApp());
}

class WebubbleApp extends StatelessWidget {
  const WebubbleApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Theme tokens are replaced by the shared design system in WB-002.
    return MaterialApp(
      title: 'Webubble',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(useMaterial3: true),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Webubble', style: text.headlineLarge),
              const SizedBox(height: 8),
              Text(
                'Local commerce for buyers, sellers and street vendors.',
                style: text.bodyLarge,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
