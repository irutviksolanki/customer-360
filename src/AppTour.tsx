import React, { useState } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import Icon from './Icon';
import BrandGradient from './BrandGradient';
import { Text, fonts } from './typography';
import { useTheme } from './theme';

const steps = [
  ['LayoutDashboard', 'Start from your overview', 'The Overview brings together customer health, recent conversations, open commitments and what needs your attention.'],
  ['Building2', 'Create your customer view', 'Open Customers to add a relationship, see stakeholders and review the complete history for that account.'],
  ['MessageSquare', 'Capture every conversation', 'Use Log interaction after a meeting to save the summary, feedback, sentiment and important themes for your team.'],
  ['ListTodo', 'Turn context into action', 'Add commitments with an owner and due date. Track progress in Action tracker until the work is complete and confirmed.'],
  ['FileText', 'Prepare and learn before the next connect', 'Use a meeting brief to review past feedback and commitments. Insights helps you spot sentiment and relationship patterns across customers.'],
] as const;

export default function AppTour({ visible, onComplete }: { visible: boolean; onComplete: () => void }) {
  const { colors: C, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const current = steps[step];
  const finish = () => { onComplete(); setStep(0); };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={finish}>
    <View style={{ flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 520, backgroundColor: C.surface, borderRadius: 16, padding: width < 500 ? 24 : 34, boxShadow: '0px 12px 40px #102b2630' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip app tour" onPress={finish} style={{ alignSelf: 'flex-end', padding: 5 }}><Text style={{ color: C.muted, fontFamily: fonts.regular, fontSize: 13 }}>Skip tour</Text></Pressable>
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 24 }}><Icon name={current[0]} size={30} color={C.green} /></View>
        <Text accessibilityRole="header" style={{ color: C.dark, fontFamily: fonts.regular, fontSize: 27, lineHeight: 35, fontWeight: '600', marginBottom: 10 }}>{current[1]}</Text>
        <Text style={{ color: C.muted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 25, marginBottom: 28 }}>{current[2]}</Text>
        <View style={{ flexDirection: 'row', gap: 7, marginBottom: 28 }}>{steps.map((_, index) => <View key={index} style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: index === step ? C.green : C.line }} />)}</View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: C.muted, fontFamily: fonts.regular, fontSize: 12 }}>Step {step + 1} of {steps.length}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={step === steps.length - 1 ? 'Finish app tour' : 'Next tour step'} onPress={() => step === steps.length - 1 ? finish() : setStep(step + 1)} style={{ borderRadius: 7, overflow: 'hidden' }}><BrandGradient style={{ paddingHorizontal: 20, paddingVertical: 11 }}><Text style={{ color: isDark ? '#111' : C.onAccent, fontFamily: fonts.regular, fontSize: 14, fontWeight: '600' }}>{step === steps.length - 1 ? 'Start exploring' : 'Next'}</Text></BrandGradient></Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}
