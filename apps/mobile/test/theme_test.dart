import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:webubble/design/theme.dart';
import 'package:webubble/design/tokens.g.dart';

/// WB-002: the Flutter theme is built from the same tokens as the website.
void main() {
  test('light theme uses the shared token colours', () {
    final theme = wbTheme(Brightness.light);
    expect(theme.colorScheme.primary, WbColors.light.primary);
    expect(theme.colorScheme.error, WbColors.light.danger);
    expect(theme.scaffoldBackgroundColor, WbColors.light.bg);
  });

  test('dark theme uses the dark token colours', () {
    final theme = wbTheme(Brightness.dark);
    expect(theme.colorScheme.primary, WbColors.dark.primary);
    expect(theme.colorScheme.brightness, Brightness.dark);
  });

  testWidgets('buttons meet the 48dp touch-target minimum', (tester) async {
    await tester.pumpWidget(MaterialApp(
      theme: wbTheme(Brightness.light),
      home: Scaffold(
        body: Center(child: FilledButton(onPressed: () {}, child: const Text('Go'))),
      ),
    ));
    final size = tester.getSize(find.byType(FilledButton));
    expect(size.height, greaterThanOrEqualTo(WbSize.touchTarget));
    expect(size.width, greaterThanOrEqualTo(WbSize.touchTarget));
    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    await expectLater(tester, meetsGuideline(textContrastGuideline));
  });
}
