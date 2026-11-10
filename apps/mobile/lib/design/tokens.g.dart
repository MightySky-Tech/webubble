// Generated from packages/ui/tokens/tokens.json by build-tokens.mjs. Do not edit.
// ignore_for_file: constant_identifier_names
import 'package:flutter/painting.dart';

class WbColors {
  const WbColors({
    required this.bg,
    required this.surface,
    required this.text,
    required this.textMuted,
    required this.border,
    required this.primary,
    required this.onPrimary,
    required this.danger,
    required this.onDanger,
    required this.success,
    required this.focus,
  });

  final Color bg;
  final Color surface;
  final Color text;
  final Color textMuted;
  final Color border;
  final Color primary;
  final Color onPrimary;
  final Color danger;
  final Color onDanger;
  final Color success;
  final Color focus;

  static const light = WbColors(
    bg: Color(0xFFFFFFFF),
    surface: Color(0xFFF4F5F7),
    text: Color(0xFF16181D),
    textMuted: Color(0xFF4A5160),
    border: Color(0xFF7A8394),
    primary: Color(0xFF1F5FBF),
    onPrimary: Color(0xFFFFFFFF),
    danger: Color(0xFFB42318),
    onDanger: Color(0xFFFFFFFF),
    success: Color(0xFF18794E),
    focus: Color(0xFF1F5FBF),
  );

  static const dark = WbColors(
    bg: Color(0xFF121418),
    surface: Color(0xFF1C1F26),
    text: Color(0xFFF2F4F7),
    textMuted: Color(0xFFB4BCC8),
    border: Color(0xFF7D8597),
    primary: Color(0xFF7FAEF5),
    onPrimary: Color(0xFF0B1830),
    danger: Color(0xFFF97066),
    onDanger: Color(0xFF2A0A07),
    success: Color(0xFF47CD89),
    focus: Color(0xFF7FAEF5),
  );
}

abstract final class WbSpace {
  static const double s0 = 0.0;
  static const double s1 = 4.0;
  static const double s2 = 8.0;
  static const double s3 = 12.0;
  static const double s4 = 16.0;
  static const double s5 = 24.0;
  static const double s6 = 32.0;
  static const double s7 = 48.0;
  static const double s8 = 64.0;
}

abstract final class WbRadius {
  static const double sm = 4.0;
  static const double md = 8.0;
  static const double lg = 12.0;
  static const double full = 9999.0;
}

abstract final class WbFontSize {
  static const double xs = 12.0;
  static const double sm = 14.0;
  static const double md = 16.0;
  static const double lg = 18.0;
  static const double xl = 22.0;
  static const double xxl = 28.0;
  static const double xxxl = 34.0;
}

abstract final class WbFontWeight {
  static const int regular = 400;
  static const int medium = 500;
  static const int bold = 700;
}

abstract final class WbLineHeight {
  static const double tight = 1.25;
  static const double normal = 1.50;
}

abstract final class WbSize {
  static const double touchTarget = 48.0;
  static const double borderWidth = 1.0;
  static const double focusRingWidth = 3.0;
}

abstract final class WbBreakpoint {
  static const double sm = 480.0;
  static const double md = 768.0;
  static const double lg = 1024.0;
  static const double xl = 1280.0;
}
