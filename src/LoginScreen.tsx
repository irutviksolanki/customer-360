import React, {useState} from 'react';
import {ActivityIndicator,View,Pressable,ScrollView,useWindowDimensions,Platform,KeyboardAvoidingView,Modal} from 'react-native';
import Icon from './Icon';
import {Text,TextInput,fonts} from './typography';
import BrandGradient from './BrandGradient';
import {useTheme} from './theme';
const green='#1D5179',dark='#20332e',muted='#66776f',line='#dce7ed';
const font=fonts.regular;
function Copy({children,style,...rest}:any){const {colors:C}=useTheme();return <Text {...rest} style={[{fontFamily:font,fontSize:16,lineHeight:25,color:C.dark},style]}>{children}</Text>}
function Line({children,style,...rest}:any){return <View {...rest} style={[{flexDirection:'row',alignItems:'center',gap:10},style]}>{children}</View>}
function Brand({light=false,darkMode=false}:any){return <Line style={{gap:12}}><View style={{width:43,height:43,borderRadius:11,backgroundColor:light?(darkMode?'#111111':'#ffffff18'):green,alignItems:'center',justifyContent:'center'}}><Icon name="Orbit" size={29} color="white"/></View><View><Copy style={{fontSize:23,lineHeight:29,fontWeight:'700',letterSpacing:-.7,color:light?(darkMode?'#111111':'white'):dark}}>Customer<Text style={{color:light?(darkMode?green:'#a9e1f4'):green}}>360</Text></Copy><Copy style={{fontSize:10,lineHeight:17,letterSpacing:2.5,color:light?(darkMode?'#52606a':'#c5e3ef'):muted}}>WELSPUN GCC</Copy></View></Line>}
function MicrosoftMark(){return <View accessibilityElementsHidden style={{width:19,height:19,flexDirection:'row',flexWrap:'wrap',gap:3}}>{['#f35325','#81bc06','#05a6f0','#ffba08'].map(color=><View key={color} style={{width:8,height:8,backgroundColor:color}}/>)}</View>}
type Props={reg:boolean;form:{name:string;email:string;password:string};busy:boolean;error:string;onChange:(key:'name'|'email'|'password',value:string)=>void;onSubmit:()=>void;onToggleMode:()=>void};
export default function LoginScreen({reg,form,busy,error,onChange,onSubmit,onToggleMode}:Props){
 const {width}=useWindowDimensions();const wide=width>=950,mobile=width<600;
 const {isDark,colors:C}=useTheme();const heroInk=isDark?'#111111':'white',heroMuted=isDark?'#52606a':'#c2d9e6',primaryInk=isDark?'#111111':'white';
 const {email,password}=form;
 const [visible,setVisible]=useState(false),[help,setHelp]=useState(false);
 const [sso,setSso]=useState<'company'|'microsoft'|null>(null),[ssoEmail,setSsoEmail]=useState(''),[ssoError,setSsoError]=useState('');
 const provider=sso==='microsoft'?'Microsoft Entra ID':'Company SSO';
 const setEmail=(value:string)=>onChange('email',value),setPassword=(value:string)=>onChange('password',value);
 const setError=(_value:string)=>{};
 const openSSO=(provider:'company'|'microsoft')=>{setSsoEmail(email.trim());setSsoError('');setSso(provider)};
 const previewSSO=()=>setSsoError('Organization sign-in is not configured. Please use your Customer360 email and password.');
 const change=(setter:(value:string)=>void,value:string)=>setter(value);
 const signIn=()=>{if(!busy)onSubmit()};
 const useDemo=()=>{setHelp(true)};
 return <KeyboardAvoidingView testID="login-page" behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,backgroundColor:C.bg}}><View style={{flex:1,flexDirection:'row'}}>
 {wide&&<BrandGradient style={{width:'45%',padding:52,justifyContent:'space-between'}}>
  <View style={{position:'absolute',height:650,width:650,borderWidth:1,borderColor:'#ffffff08',borderRadius:325,left:-290,bottom:-310}}/>
  <View style={{position:'absolute',height:790,width:790,borderWidth:1,borderColor:'#ffffff08',borderRadius:395,left:-360,bottom:-380}}/>
  <Brand light darkMode={isDark}/>
  <View style={{paddingVertical:42,maxWidth:490}}>
   <Line style={{marginBottom:25}}><View style={{width:25,height:1,backgroundColor:'#77d4ec'}}/><Copy style={{fontSize:11,color:'#b1dff0',letterSpacing:2,fontWeight:'600'}}>CONNECTED CONVERSATIONS</Copy></Line>
   <Copy accessibilityRole="header" style={{fontSize:width<1200?39:49,lineHeight:width<1200?49:59,letterSpacing:-1.5,fontWeight:'500',color:heroInk}}>Every conversation.{ '\n' }One shared memory.</Copy>
   <Copy style={{fontSize:16,lineHeight:28,color:heroMuted,marginTop:22,maxWidth:370}}>Walk into every customer interaction with context. Walk out with a clear path forward.</Copy>
   <View style={{marginTop:41,borderWidth:1,borderColor:'#ffffff20',backgroundColor:'#ffffff08',borderRadius:14,padding:23}}>
    <Line style={{justifyContent:'space-between',marginBottom:24}}><Line><View style={{width:39,height:39,borderRadius:9,backgroundColor:'#b7d9f020',alignItems:'center',justifyContent:'center'}}><Copy style={{color:isDark?'#1D5179':'#c3e5f2',fontSize:13,fontWeight:'700'}}>WL</Copy></View><View><Copy style={{color:heroInk,fontSize:14,fontWeight:'600',lineHeight:21}}>Welspun Living</Copy><Copy style={{color:isDark?'#52606a':'#a9c5d4',fontSize:12,lineHeight:18}}>Your relationship, at a glance</Copy></View></Line><View style={{paddingHorizontal:9,paddingVertical:3,borderRadius:5,backgroundColor:'#b4d9e220'}}><Copy style={{fontSize:11,lineHeight:18,color:isDark?'#1D5179':'#b8e0ef'}}>Positive</Copy></View></Line>
    {[['MessageSquare','The conversation','Customer context, remembered'],['ListTodo','The commitment','A clear owner. A visible next step.'],['FileText','The next connect','Prepared, before you walk in']].map(([icon,label,sub],i)=><Line key={label} style={{alignItems:'flex-start',gap:13,marginBottom:i<2?21:0}}><View style={{width:29,height:29,borderRadius:15,backgroundColor:'#ffffff0d',alignItems:'center',justifyContent:'center'}}><Icon name={icon} size={14} color={isDark?'#1D5179':'#a4d9ed'}/></View><View><Copy style={{fontSize:13,lineHeight:19,color:heroInk,fontWeight:'500'}}>{label}</Copy><Copy style={{fontSize:12,lineHeight:20,color:isDark?'#52606a':'#aac7d5'}}>{sub}</Copy></View></Line>)}
   </View>
  </View>
  <Line style={{gap:9}}><Icon name="Handshake" size={17} color={isDark?'#1D5179':'#a0c6d6'}/><Copy style={{fontSize:12,color:isDark?'#52606a':'#a4c4d3'}}>One Customer, One Memory, One GCC View</Copy></Line>
 </BrandGradient>}
 <ScrollView contentContainerStyle={{flexGrow:1,justifyContent:'center',alignItems:'center',padding:mobile?25:48,paddingVertical:mobile?35:50}} style={{flex:1,backgroundColor:C.bg}} keyboardShouldPersistTaps="handled">
  <View style={{width:'100%',maxWidth:415}}>
   {!wide&&<View style={{marginBottom:mobile?45:50}}><Brand/></View>}
   <Line style={{gap:7,marginBottom:15}}><View style={{height:6,width:6,borderRadius:3,backgroundColor:green}}/><Copy style={{fontSize:11,fontWeight:'600',letterSpacing:1.5,color:green}}>CUSTOMER RELATIONSHIP WORKSPACE</Copy></Line>
   <Copy accessibilityRole="header" style={{fontSize:mobile?31:35,lineHeight:45,letterSpacing:-1,fontWeight:'600'}}>{reg?'Create your account':'Welcome back'}</Copy>
   <Copy style={{color:C.muted,marginTop:8,marginBottom:32,lineHeight:26}}>Sign in to pick up the conversation.</Copy>
   <View style={{gap:12}}>
    <Pressable testID="company-sso" accessibilityRole="button" onPress={()=>openSSO('company')} style={({pressed})=>({height:51,borderWidth:1,borderColor:C.accentBorder,borderRadius:7,backgroundColor:pressed?C.elevated:C.soft,alignItems:'center',justifyContent:'center'})}><Line style={{gap:11}}><Icon name="Building2" color={C.green} size={19}/><Copy style={{fontSize:15,fontWeight:'600',color:C.green}}>Continue with Company SSO</Copy></Line></Pressable>
    <Pressable testID="microsoft-sso" accessibilityRole="button" onPress={()=>openSSO('microsoft')} style={({pressed})=>({height:51,borderWidth:1,borderColor:C.line,borderRadius:7,backgroundColor:pressed?C.elevated:C.surface,alignItems:'center',justifyContent:'center'})}><Line style={{gap:11}}><MicrosoftMark/><Copy style={{fontSize:15,fontWeight:'500'}}>Sign in with Microsoft Entra ID</Copy></Line></Pressable>
    <Copy style={{fontSize:12,lineHeight:20,color:'#7a909d',textAlign:'center'}}>SSO preview · Organization connection pending</Copy>
   </View>
   <Line style={{marginVertical:25,gap:13}}><View style={{height:1,backgroundColor:'#e9eeeb',flex:1}}/><Copy style={{color:'#98a59c',fontSize:11,letterSpacing:.8}}>OR SIGN IN WITH EMAIL</Copy><View style={{height:1,backgroundColor:'#e9eeeb',flex:1}}/></Line>
   <View style={{gap:21}}>
{reg&&<View><Copy style={{fontSize:14,fontWeight:'500',marginBottom:8}}>Full name</Copy><TextInput accessibilityLabel="Full name" value={form.name} onChangeText={v=>onChange('name',v)} autoCapitalize="words" placeholder="Your full name" placeholderTextColor={C.muted} style={{height:51,borderWidth:1,borderColor:C.inputBorder,borderRadius:7,paddingHorizontal:14,color:C.dark,fontSize:16}}/></View>}
    <View><Copy style={{fontSize:14,fontWeight:'500',marginBottom:8}}>Work email</Copy><View style={{height:51,borderRadius:7,borderWidth:1,borderColor:error&&!email? C.red:C.inputBorder,flexDirection:'row',alignItems:'center',paddingHorizontal:14,gap:12}}><Icon name="Mail" size={18} color={C.muted}/><TextInput testID="login-email" accessibilityLabel="Work email" autoComplete="email" textContentType="emailAddress" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="you@company.com" placeholderTextColor={C.muted} value={email} onChangeText={v=>change(setEmail,v)} onSubmitEditing={signIn} style={{fontFamily:font,fontSize:16,color:C.dark,flex:1,height:'100%',paddingVertical:10}}/></View></View>
    <View><Line style={{justifyContent:'space-between',marginBottom:8}}><Copy style={{fontSize:14,fontWeight:'500'}}>Password</Copy><Pressable accessibilityRole="button" onPress={()=>{setHelp(!help);setError('')}}><Copy style={{fontSize:13,fontWeight:'500',color:C.green}}>Forgot password?</Copy></Pressable></Line><View style={{height:51,borderRadius:7,borderWidth:1,borderColor:C.inputBorder,flexDirection:'row',alignItems:'center',paddingHorizontal:14,gap:12}}><Icon name="LockKeyhole" size={18} color={C.muted}/><TextInput testID="login-password" accessibilityLabel="Password" autoComplete="off" secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} placeholder="Enter your password" placeholderTextColor={C.muted} value={password} onChangeText={v=>change(setPassword,v)} onSubmitEditing={signIn} returnKeyType="go" style={{fontFamily:font,fontSize:16,color:C.dark,flex:1,height:'100%',paddingVertical:10}}/><Pressable accessibilityRole="button" accessibilityLabel={visible?'Hide password':'Show password'} onPress={()=>setVisible(!visible)} style={{paddingVertical:10,paddingLeft:5}}><Icon name={visible?'EyeOff':'Eye'} size={18} color={C.muted}/></Pressable></View></View>
    {!!error&&<Line accessibilityRole="alert" style={{backgroundColor:'#fff1f0',borderRadius:6,padding:12,alignItems:'flex-start'}}><Icon name="CircleAlert" size={17} color="#b75555"/><Copy style={{fontSize:13,lineHeight:21,color:'#a94f4f',flex:1}}>{error}</Copy></Line>}
    {help&&<View accessibilityRole="alert" style={{backgroundColor:C.elevated,borderRadius:7,padding:14}}><Copy style={{fontSize:13,lineHeight:22,color:C.muted}}>For account access or password assistance, contact your GCC administrator.</Copy></View>}
    <Pressable testID="login-submit" accessibilityRole="button" accessibilityLabel="Sign in" disabled={busy} onPress={signIn} style={({pressed})=>({height:50,borderRadius:7,overflow:'hidden',opacity:pressed?.85:1})}><BrandGradient style={{flex:1,alignItems:'center',justifyContent:'center'}}><Copy style={{fontSize:15,fontWeight:'600',color:primaryInk}}>{busy?'Signing in…':reg?'Create account':'Sign in'}</Copy></BrandGradient></Pressable>
   </View>
   <Line style={{marginVertical:27,gap:13}}><View style={{height:1,backgroundColor:'#e9eeeb',flex:1}}/><Copy style={{color:'#98a59c',fontSize:11,letterSpacing:.8}}>EXPLORE THE PREVIEW</Copy><View style={{height:1,backgroundColor:'#e9eeeb',flex:1}}/></Line>
   <View style={{padding:18,borderRadius:9,backgroundColor:C.elevated,borderWidth:1,borderColor:C.line}}>
    <Line style={{justifyContent:'space-between',marginBottom:10}}><Line style={{gap:7}}><Icon name="CircleHelp" size={16} color={C.green}/><Copy style={{fontSize:13,fontWeight:'600'}}>Try the demo workspace</Copy></Line><View style={{borderRadius:4,paddingHorizontal:7,backgroundColor:C.soft}}><Copy style={{fontSize:10,lineHeight:20,color:C.muted}}>SAMPLE DATA</Copy></View></Line>
    <Copy selectable style={{fontSize:13,lineHeight:23,color:C.muted}}>Sign in with your existing Customer360 account.</Copy><Copy selectable style={{fontSize:13,lineHeight:23,color:C.muted}}>The ZIP preview credentials are not an account on this server.</Copy>
    <Pressable accessibilityRole="button" onPress={useDemo} style={{paddingTop:13,paddingBottom:2}}><Copy style={{fontSize:13,fontWeight:'600',color:C.green}}>How do I get access?</Copy></Pressable>
   </View>
   <Line style={{justifyContent:'center',marginTop:27,gap:6}}><Icon name="ShieldCheck" size={14} color="#849aa6"/><Copy style={{fontSize:11,color:'#849aa6'}}>Private workspace · Customer360</Copy></Line>
   <Copy style={{fontSize:11,lineHeight:18,color:'#8d9faa',textAlign:'center',marginTop:7}}>Company SSO and Microsoft Entra ID require organization setup.</Copy>
  </View>
 <Pressable accessibilityRole="button" onPress={()=>{setVisible(false);onToggleMode()}} style={{paddingVertical:20}}><Copy style={{fontSize:14,color:green,textAlign:'center'}}>{reg?'Already registered? Sign in':'New here? Create an account'}</Copy></Pressable>
 </ScrollView></View>
 <Modal visible={sso!==null} transparent animationType="fade" onRequestClose={()=>setSso(null)}>
  <View style={{flex:1,backgroundColor:'#102b2677',alignItems:'center',justifyContent:'center',padding:mobile?18:35}}>
   <Pressable accessibilityLabel="Close SSO preview backdrop" onPress={()=>setSso(null)} style={{position:'absolute',top:0,right:0,bottom:0,left:0}}/>
   <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{width:'100%',maxWidth:470,maxHeight:'95%'}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:mobile?24:32,backgroundColor:C.surface,borderRadius:14}} style={{borderRadius:14}}>
     <Line style={{justifyContent:'space-between',marginBottom:25}}><View style={{width:47,height:47,borderRadius:12,backgroundColor:'#eff6fa',alignItems:'center',justifyContent:'center'}}>{sso==='microsoft'?<MicrosoftMark/>:<Icon name="Building2" color={green} size={24}/>}</View><Pressable accessibilityRole="button" accessibilityLabel="Close SSO preview" onPress={()=>setSso(null)} style={{padding:8}}><Icon name="X" size={21}/></Pressable></Line>
     <Copy style={{fontSize:11,letterSpacing:1.4,color:green,fontWeight:'600',marginBottom:6}}>SINGLE SIGN-ON</Copy>
     <Copy accessibilityRole="header" style={{fontSize:27,lineHeight:36,fontWeight:'600',letterSpacing:-.6}}>{provider}</Copy>
     <Copy style={{fontSize:15,lineHeight:25,color:muted,marginTop:9,marginBottom:23}}>{sso==='microsoft'?'Use your Microsoft work account to access your GCC workspace.':'Use your organization’s identity provider to access your GCC workspace.'}</Copy>
     <Copy style={{fontSize:14,fontWeight:'500',marginBottom:8}}>Work email</Copy>
     <TextInput accessibilityLabel="SSO work email" testID="sso-email" autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={ssoEmail} onChangeText={v=>{setSsoEmail(v);setSsoError('')}} onSubmitEditing={previewSSO} returnKeyType="go" style={{height:50,borderWidth:1,borderColor:ssoError?'#bd5555':line,borderRadius:7,paddingHorizontal:14,fontFamily:font,fontSize:16,color:dark}}/>
     {!!ssoError&&<Copy accessibilityRole="alert" style={{fontSize:13,lineHeight:21,color:'#b75555',marginTop:8}}>{ssoError}</Copy>}
     <View style={{backgroundColor:'#f4f8fa',borderWidth:1,borderColor:'#e1ebf0',borderRadius:8,padding:15,marginVertical:22}}><Line style={{gap:7,marginBottom:6}}><Icon name="Info" size={16} color={green}/><Copy style={{fontSize:13,fontWeight:'600'}}>Preview mode · Connection pending</Copy></Line><Copy style={{fontSize:13,lineHeight:22,color:'#657d8b'}}>Organization sign-in is not connected. Use your Customer360 email and password to access your workspace.</Copy><Copy style={{fontSize:12,lineHeight:21,color:'#7a909d',marginTop:8}}>Live {provider} sign-in requires your organization’s identity-provider connection.</Copy></View>
     <Pressable accessibilityRole="button" onPress={previewSSO} style={({pressed})=>({height:50,borderRadius:7,overflow:'hidden',opacity:pressed?.85:1})}><BrandGradient style={{flex:1,alignItems:'center',justifyContent:'center'}}><Copy style={{fontSize:15,fontWeight:'600',color:primaryInk}}>Check SSO availability</Copy></BrandGradient></Pressable>
     <Pressable accessibilityRole="button" onPress={()=>setSso(null)} style={{padding:14,alignItems:'center',marginTop:6}}><Copy style={{fontSize:14,color:muted}}>Back to sign in</Copy></Pressable>
    </ScrollView>
   </KeyboardAvoidingView>
  </View>
 </Modal>
 </KeyboardAvoidingView>
}
