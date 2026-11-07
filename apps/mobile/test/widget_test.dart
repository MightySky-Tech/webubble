import 'package:flutter_test/flutter_test.dart';
import 'package:webubble/main.dart';

void main() {
  testWidgets('home screen shows the Webubble name', (tester) async {
    await tester.pumpWidget(const WebubbleApp());
    expect(find.text('Webubble'), findsOneWidget);
  });
}
