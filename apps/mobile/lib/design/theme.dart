import 'package:flutter/material.dart';

import 'tokens.g.dart';

/// Builds the app theme from the shared design tokens (WB-002), so Android and iOS
/// match the website. Values are placeholders until screens are approved at Gate A.
ThemeData wbTheme(Brightness brightness) {
  final c = brightness == Brightness.dark ? WbColors.dark : WbColors.light;
  final radius = BorderRadius.circular(WbRadius.md);
  const minButtonSize = Size(WbSize.touchTarget, WbSize.touchTarget);

  OutlineInputBorder border(Color color, [double width = WbSize.borderWidth]) =>
      OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: color, width: width));

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    scaffoldBackgroundColor: c.bg,
    colorScheme: ColorScheme(
      brightness: brightness,
      primary: c.primary,
      onPrimary: c.onPrimary,
      secondary: c.primary,
      onSecondary: c.onPrimary,
      error: c.danger,
      onError: c.onDanger,
      surface: c.bg,
      onSurface: c.text,
      surfaceContainerHighest: c.surface,
      onSurfaceVariant: c.textMuted,
      outline: c.border,
    ),
    textTheme: const TextTheme(
      headlineLarge: TextStyle(fontSize: WbFontSize.xxxl, height: WbLineHeight.tight),
      headlineMedium: TextStyle(fontSize: WbFontSize.xxl, height: WbLineHeight.tight),
      titleLarge: TextStyle(fontSize: WbFontSize.xl, height: WbLineHeight.tight),
      bodyLarge: TextStyle(fontSize: WbFontSize.md, height: WbLineHeight.normal),
      bodyMedium: TextStyle(fontSize: WbFontSize.sm, height: WbLineHeight.normal),
      labelLarge: TextStyle(fontSize: WbFontSize.md),
    ).apply(bodyColor: c.text, displayColor: c.text),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: minButtonSize,
        padding: const EdgeInsets.symmetric(horizontal: WbSpace.s5),
        shape: RoundedRectangleBorder(borderRadius: radius),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: minButtonSize,
        foregroundColor: c.text,
        side: BorderSide(color: c.border),
        shape: RoundedRectangleBorder(borderRadius: radius),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      constraints: const BoxConstraints(minHeight: WbSize.touchTarget),
      contentPadding: const EdgeInsets.symmetric(horizontal: WbSpace.s3, vertical: WbSpace.s3),
      border: border(c.border),
      enabledBorder: border(c.border),
      focusedBorder: border(c.focus, WbSize.focusRingWidth),
      errorBorder: border(c.danger, 2),
      focusedErrorBorder: border(c.danger, WbSize.focusRingWidth),
      helperStyle: TextStyle(color: c.textMuted, fontSize: WbFontSize.sm),
      errorStyle: TextStyle(color: c.danger, fontSize: WbFontSize.sm),
    ),
  );
}
