import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import Icon from './Icon';
import BrandGradient from './BrandGradient';
import { Text, fonts } from './typography';
import { useTheme } from './theme';

const steps = [
  { icon: 'LayoutDashboard', label: 'Overview', title: 'Your day starts with the big picture.', description: 'See your customer relationships, recent conversations, open commitments and the signals that need attention in one place.', action: 'Scan the overview before your next customer conversation.', preview: [['Active customers', 'Your relationships'], ['Open commitments', 'What needs follow-through'], ['Customer sentiment', 'How relationships are trending']] },
  { icon: 'Building2', label: 'Customers', title: 'Build one shared customer view.', description: 'Add a customer, then open its profile to find stakeholders, interactions and commitments together. The timeline keeps the relationship history in context.', action: 'Start with Add customer, then open the customer profile.', preview: [['Customer profile', 'Business unit and owner'], ['Stakeholders', 'The people involved'], ['Timeline', 'A shared history of conversations']] },
  { icon: 'MessageSquare', label: 'Interactions', title: 'Capture the conversation while it is fresh.', description: 'Log a meeting with participants, a summary, feedback, themes and sentiment. Save a draft if you need to finish it later; submit when the record is ready.', action: 'Use Log interaction from the overview or Interactions.', preview: [['Meeting details', 'Who, when and what happened'], ['Feedback', 'What the customer said'], ['Sentiment', 'How the conversation felt']] },
  { icon: 'ListTodo', label: 'Action tracker', title: 'Give every promise an owner.', description: 'Create commitments from a customer conversation. Assign an owner, priority and due date, then record progress, evidence and customer confirmation before closing them.', action: 'Open Action tracker to review what is open or overdue.', preview: [['Open', 'Owner and due date assigned'], ['In progress', 'Updates and evidence recorded'], ['Closed', 'Customer confirmation captured']] },
  { icon: 'FileText', label: 'Meeting brief', title: 'Walk into the next meeting prepared.', description: 'From a customer profile or the overview, prepare a brief that brings together recent interactions, feedback and open commitments.', action: 'Choose Prepare meeting brief for a customer.', preview: [['Recent conversations', 'What was discussed'], ['Open commitments', 'What you promised'], ['Points to acknowledge', 'What matters next']] },
  { icon: 'ChartNoAxesCombined', label: 'Insights', title: 'See patterns across your relationships.', description: 'Use Insights to explore sentiment, common feedback themes and follow-through by function. Search and filters help you trace each signal back to its records.', action: 'Open Insights to turn your captured work into a clearer picture.', preview: [['Sentiment over time', 'Relationship pulse'], ['Feedback themes', 'Recurring needs'], ['Follow-through', 'Progress by function']] },
] as const;

export default function AppTour({ onComplete }: { onComplete: () => void }) {
  const { colors: C, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [step, setStep] = useState(0);
  const motion = useRef(new Animated.Value(1)).current;
  const current = steps[step];
  useEffect(() => {
    motion.setValue(0);
    const animation = Animated.timing(motion, { toValue: 1, duration: 360, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [step, motion]);
  const ink = isDark ? '#111111' : C.onAccent;
  const copy = (value: string, size = 14, color = C.dark, weight: '400' | '500' | '600' | '700' = '400') => <Text style={{ fontFamily: fonts.regular, fontSize: size, color, fontWeight: weight, lineHeight: size * 1.5 }}>{value}</Text>;
  return <View testID="app-tour-screen" style={{ flex: 1, backgroundColor: C.bg }}>
    <View style={{ borderBottomWidth: 1, borderColor: C.line, backgroundColor: C.surface, paddingHorizontal: compact ? 20 : 48, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}><BrandGradient style={{ width: 39, height: 39, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}><Icon name="Orbit" color={ink} size={25} /></BrandGradient><View>{copy('Customer360', 17, C.dark, '700')}{copy('GETTING STARTED', 9, C.muted, '600')}</View></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Skip app tour" onPress={onComplete} style={{ padding: 12 }}>{copy('Skip tour', 13, C.muted, '500')}</Pressable>
    </View>
    <ScrollView key={step} contentContainerStyle={{ flexGrow: 1, width: '100%', maxWidth: 1260, alignSelf: 'center', paddingHorizontal: compact ? 22 : 48, paddingTop: compact ? 28 : 46, paddingBottom: 24 }}>
      <View style={{ flexDirection: 'row', gap: 7, marginBottom: compact ? 28 : 44 }}>{steps.map((s, index) => <Pressable key={s.label} accessibilityRole="button" accessibilityLabel={`Tour step ${index + 1}: ${s.label}`} onPress={() => setStep(index)} style={{ flex: 1, gap: 8 }}><View style={{ height: 5, borderRadius: 4, backgroundColor: index <= step ? C.green : C.line }} />{!compact && copy(s.label, 11, index === step ? C.green : C.muted, index === step ? '600' : '400')}</Pressable>)}</View>
      <Animated.View style={{ flex: 1, opacity: motion, transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }], flexDirection: compact ? 'column' : 'row', alignItems: 'center', gap: compact ? 30 : 60 }}>
        <View style={{ flex: compact ? undefined : 1, width: compact ? '100%' : undefined }}>
          <View style={{ alignSelf: 'flex-start', borderRadius: 30, paddingHorizontal: 13, paddingVertical: 6, backgroundColor: C.soft, marginBottom: 23 }}>{copy(`HOW IT WORKS  ·  ${String(step + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`, 11, C.green, '600')}</View>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.regular, color: C.dark, fontWeight: '700', fontSize: compact ? 31 : 43, lineHeight: compact ? 41 : 56, letterSpacing: -1.2, marginBottom: 18 }}>{current.title}</Text>
          <Text style={{ fontFamily: fonts.regular, color: C.muted, fontSize: compact ? 15 : 17, lineHeight: compact ? 25 : 29, maxWidth: 560 }}>{current.description}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 28, padding: 16, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line }}><Icon name="ArrowRight" color={C.green} size={19} /><View style={{ flex: 1 }}>{copy(current.action, 13, C.dark, '500')}</View></View>
        </View>
        <View style={{ flex: compact ? undefined : 1, width: '100%', maxWidth: 540, backgroundColor: C.surface, borderRadius: 22, borderWidth: 1, borderColor: C.line, overflow: 'hidden', shadowColor: '#142e44', shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 5 }}>
          <BrandGradient style={{ padding: compact ? 24 : 32, minHeight: compact ? 135 : 180, justifyContent: 'space-between' }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}><View style={{ width: 48, height: 48, borderRadius: 13, backgroundColor: '#ffffff24', justifyContent: 'center', alignItems: 'center' }}><Icon name={current.icon} size={25} color={ink} /></View>{copy(`0${step + 1} / 0${steps.length}`, 12, ink, '600')}</View><View>{copy('CUSTOMER360 WORKFLOW', 10, ink, '600')}{copy(current.label, compact ? 23 : 29, ink, '700')}</View></BrandGradient>
          <View style={{ padding: compact ? 20 : 28, gap: 13 }}>{current.preview.map(([heading, detail], index) => <View key={heading} style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, backgroundColor: index === 0 ? C.soft : C.elevated, gap: 14 }}><View style={{ height: 31, width: 31, borderRadius: 16, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>{copy(String(index + 1), 12, C.green, '600')}</View><View style={{ flex: 1 }}>{copy(heading, 14, C.dark, '600')}{copy(detail, 12, C.muted)}</View><Icon name="Check" size={16} color={C.green} /></View>)}</View>
        </View>
      </Animated.View>
    </ScrollView>
    <View style={{ backgroundColor: C.surface, borderTopWidth: 1, borderColor: C.line, paddingHorizontal: compact ? 22 : 48, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous tour step" disabled={step === 0} onPress={() => setStep(step - 1)} style={{ opacity: step === 0 ? 0.35 : 1, padding: 10 }}>{copy('← Back', 14, C.dark, '500')}</Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>{!compact && copy(`${step + 1} of ${steps.length}`, 12, C.muted)}<Pressable accessibilityRole="button" accessibilityLabel={step === steps.length - 1 ? 'Finish app tour' : 'Next tour step'} onPress={() => step === steps.length - 1 ? onComplete() : setStep(step + 1)} style={{ borderRadius: 9, overflow: 'hidden' }}><BrandGradient style={{ paddingHorizontal: 22, paddingVertical: 12 }}>{copy(step === steps.length - 1 ? 'Open workspace  →' : 'Continue  →', 14, ink, '600')}</BrandGradient></Pressable></View>
    </View>
  </View>;
}
