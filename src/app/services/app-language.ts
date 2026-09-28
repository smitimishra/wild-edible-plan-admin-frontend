import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type AppLanguage = 'en' | 'hi';

const HINDI_TRANSLATIONS: Record<string, string> = {
  Admin: 'व्यवस्थापक',
  'Approval System': 'अनुमोदन प्रणाली',
  'Open sidebar': 'साइडबार खोलें',
  'Close sidebar': 'साइडबार बंद करें',
  'Collapse sidebar': 'साइडबार संक्षिप्त करें',
  'Expand sidebar': 'साइडबार विस्तृत करें',
  Dashboard: 'डैशबोर्ड',
  'User Management': 'उपयोगकर्ता प्रबंधन',
  'Role Management': 'भूमिका प्रबंधन',
  'Hierarchy Management': 'पदानुक्रम प्रबंधन',
  'Health Analysis': 'स्वास्थ्य विश्लेषण',
  Administration: 'प्रशासन',
  'Logged-in Devices': 'लॉग-इन डिवाइस',
  Settings: 'सेटिंग्स',
  'Admin Panel': 'व्यवस्थापक पैनल',
  'Open account menu': 'खाता मेनू खोलें',
  'Account menu': 'खाता मेनू',
  'Account Settings': 'खाता सेटिंग्स',
  Theme: 'थीम',
  Light: 'लाइट',
  Dark: 'डार्क',
  Default: 'डिफ़ॉल्ट',
  Logout: 'लॉगआउट',
  REVIEWER: 'समीक्षक',
  'Pending Approvals': 'लंबित अनुमोदन',
  'Matching plant found': 'मिलता-जुलता पौधा मिला',
  'New (save next version)': 'नया (अगला संस्करण सहेजें)',
  'Existing (compare)': 'मौजूदा (तुलना करें)',
  'Existing record': 'मौजूदा रिकॉर्ड',
  'New record': 'नया रिकॉर्ड',
  'Common Name': 'सामान्य नाम',
  'Scientific Name': 'वैज्ञानिक नाम',
  'Plant Name': 'पौधे का नाम',
  Images: 'चित्र',
  'No image available': 'कोई चित्र उपलब्ध नहीं है',
  'Replace Existing Record': 'मौजूदा रिकॉर्ड बदलें',
  Cancel: 'रद्द करें',
  Save: 'सहेजें',
  Submit: 'जमा करें',
  Search: 'खोजें',
  'Search users': 'उपयोगकर्ता खोजें',
  'No data available': 'कोई डेटा उपलब्ध नहीं है',
  'No records found': 'कोई रिकॉर्ड नहीं मिला',
  Name: 'नाम',
  Email: 'ईमेल',
  Phone: 'फ़ोन',
  Role: 'भूमिका',
  Status: 'स्थिति',
  Actions: 'कार्रवाई',
  Active: 'सक्रिय',
  Inactive: 'निष्क्रिय',
  Loading: 'लोड हो रहा है',
  'Loading...': 'लोड हो रहा है...',
  'Please wait...': 'कृपया प्रतीक्षा करें...',
  Approve: 'अनुमोदित करें',
  Reject: 'अस्वीकार करें',
  Comments: 'टिप्पणियाँ',
  Description: 'विवरण',
  'Scientific name': 'वैज्ञानिक नाम',
  'Common name': 'सामान्य नाम',
  'System Default': 'सिस्टम डिफ़ॉल्ट',
  'Total Users': 'कुल उपयोगकर्ता',
  'Click to view all users': 'सभी उपयोगकर्ताओं को देखने के लिए क्लिक करें',
  'Active Users': 'सक्रिय उपयोगकर्ता',
  'Click to view active users': 'सक्रिय उपयोगकर्ताओं को देखने के लिए क्लिक करें',
  'Inactive Users': 'निष्क्रिय उपयोगकर्ता',
  'Click to view inactive users': 'निष्क्रिय उपयोगकर्ताओं को देखने के लिए क्लिक करें',
  Administrators: 'व्यवस्थापक',
  'System administration accounts': 'सिस्टम प्रशासन खाते',
  'Employee / Field Staff': 'कर्मचारी / फील्ड स्टाफ',
  'Users who submit requests': 'अनुरोध जमा करने वाले उपयोगकर्ता',
  Reviewers: 'समीक्षक',
  'Manage Admin, Employee / Field Staff and Reviewer accounts.':
    'व्यवस्थापक, कर्मचारी / फील्ड स्टाफ और समीक्षक खातों का प्रबंधन करें।',
  'Add User': 'उपयोगकर्ता जोड़ें',
  'Users blocked after repeated failed login attempts.':
    'बार-बार गलत लॉगिन प्रयासों के बाद अवरुद्ध उपयोगकर्ता।',
  Refresh: 'रीफ़्रेश',
  'Loading blocked users...': 'अवरुद्ध उपयोगकर्ता लोड हो रहे हैं...',
  'No blocked users.': 'कोई अवरुद्ध उपयोगकर्ता नहीं है।',
  'Blocked At': 'अवरुद्ध करने का समय',
  Action: 'कार्रवाई',
  Unblock: 'अनब्लॉक करें',
  'All Users': 'सभी उपयोगकर्ता',
  User: 'उपयोगकर्ता',
  'Employee Code': 'कर्मचारी कोड',
  'Approval Position': 'अनुमोदन पद',
  Reviewer: 'समीक्षक',
  'N/A': 'लागू नहीं',
  Edit: 'संपादित करें',
  Deactivate: 'निष्क्रिय करें',
  Activate: 'सक्रिय करें',
  Delete: 'हटाएँ',
  'No users found.': 'कोई उपयोगकर्ता नहीं मिला।',
  'Try changing your search or filter.': 'अपनी खोज या फ़िल्टर बदलकर देखें।',
  Showing: 'दिखाए जा रहे हैं',
  of: 'में से',
  users: 'उपयोगकर्ता',
  Previous: 'पिछला',
  Next: 'अगला',
  'Manage roles assigned to system users.': 'सिस्टम उपयोगकर्ताओं को दी गई भूमिकाओं का प्रबंधन करें।',
  'Current Role': 'वर्तमान भूमिका',
  'Change Role': 'भूमिका बदलें',
  Protected: 'सुरक्षित',
  'Try changing your search.': 'अपनी खोज बदलकर देखें।',
  'Live system and service health from the server monitor.':
    'सर्वर मॉनिटर से सिस्टम और सेवाओं की लाइव स्थिति।',
  'Loading health analysis...': 'स्वास्थ्य विश्लेषण लोड हो रहा है...',
  'Starting the monitor and collecting the latest result.':
    'मॉनिटर शुरू हो रहा है और नवीनतम परिणाम एकत्र किए जा रहे हैं।',
  'Overall Status': 'समग्र स्थिति',
  'All systems monitored': 'सभी सिस्टम की निगरानी की जा रही है',
  Services: 'सेवाएँ',
  'Application checks': 'एप्लिकेशन जाँच',
  Warnings: 'चेतावनियाँ',
  'Needs attention': 'ध्यान देने की आवश्यकता',
  'Critical Alerts': 'गंभीर अलर्ट',
  'Immediate attention': 'तत्काल ध्यान दें',
  'Application & Services': 'एप्लिकेशन और सेवाएँ',
  'Recent Alerts': 'हाल के अलर्ट',
  'All services are running normally.': 'सभी सेवाएँ सामान्य रूप से चल रही हैं।',
  'Overall Health History': 'समग्र स्वास्थ्य इतिहास',
  'Current Snapshot': 'वर्तमान स्थिति',
  LIVE: 'लाइव',
  'Healthy status': 'स्वस्थ स्थिति',
  'Workflow Preview': 'कार्यप्रवाह पूर्वावलोकन',
  'Current approval flow': 'वर्तमान अनुमोदन प्रक्रिया',
  'REVIEWER DASHBOARD': 'समीक्षक डैशबोर्ड',
  'Plant Approval Requests': 'पौधों के अनुमोदन अनुरोध',
  'Review plant identification requests submitted by employees':
    'कर्मचारियों द्वारा जमा किए गए पौधों की पहचान के अनुरोधों की समीक्षा करें',
  'and process the reviewer approval workflow.': 'और समीक्षक अनुमोदन प्रक्रिया पूरी करें।',
  'Review plant identification requests submitted by employees and process the reviewer approval workflow.':
    'कर्मचारियों द्वारा जमा किए गए पौधों की पहचान के अनुरोधों की समीक्षा करें और समीक्षक अनुमोदन प्रक्रिया पूरी करें।',
  'Pending Reviewer Requests': 'समीक्षा के लिए लंबित अनुरोध',
  Pending: 'लंबित',
  'Approved Requests': 'अनुमोदित अनुरोध',
  Approved: 'अनुमोदित',
  'REQUEST DETAILS': 'अनुरोध विवरण',
  'Review the complete plant request without leaving the': 'पौधे के पूरे अनुरोध की समीक्षा करें,',
  'Manager panel.': 'मैनेजर पैनल छोड़े बिना।',
  'Review the complete plant request without leaving the Manager panel.':
    'मैनेजर पैनल छोड़े बिना पौधे के पूरे अनुरोध की समीक्षा करें।',
  'PLANT REQUEST': 'पौधे का अनुरोध',
  'Submitted By': 'जमा करने वाला',
  'Common / Local Name': 'सामान्य / स्थानीय नाम',
  'Submitted On': 'जमा करने की तारीख',
  'Request Number': 'अनुरोध संख्या',
  'Plant Information': 'पौधे की जानकारी',
  'Complete Request Details': 'अनुरोध का पूरा विवरण',
  'All available information submitted with this request.': 'इस अनुरोध के साथ जमा की गई सभी उपलब्ध जानकारी।',
  'Request ID': 'अनुरोध आईडी',
  'Request Type': 'अनुरोध का प्रकार',
  'Current Approval Level': 'वर्तमान अनुमोदन स्तर',
  'Submitted At': 'जमा करने का समय',
  'Completed At': 'पूरा करने का समय',
  'Employee Details': 'कर्मचारी का विवरण',
  'Employee Name': 'कर्मचारी का नाम',
  'Employee ID': 'कर्मचारी आईडी',
  'Employee Email': 'कर्मचारी ईमेल',
  'Botanical Details': 'वनस्पति विवरण',
  Family: 'परिवार',
  Habitat: 'आवास',
  Latitude: 'अक्षांश',
  Longitude: 'देशांतर',
  'Submitted Plant Image': 'जमा किया गया पौधे का चित्र',
  'Plant Details': 'पौधे का विवरण',
  'Approval History': 'अनुमोदन इतिहास',
  'No approval history available.': 'कोई अनुमोदन इतिहास उपलब्ध नहीं है।',
  Attachments: 'संलग्नक',
  'No attachments available for this request.': 'इस अनुरोध के लिए कोई संलग्नक उपलब्ध नहीं है।',
  'Reviewer Decision': 'समीक्षक का निर्णय',
  'Reason for Rejection': 'अस्वीकृति का कारण',
  'A rejection reason is required before the request can be rejected.':
    'अनुरोध अस्वीकार करने से पहले अस्वीकृति का कारण देना आवश्यक है।',
  'Pending Plant Requests': 'लंबित पौधा अनुरोध',
  'Loading pending reviewer requests...': 'समीक्षक के लंबित अनुरोध लोड हो रहे हैं...',
  'No Pending Plant Requests': 'कोई लंबित पौधा अनुरोध नहीं है',
  'There are currently no plant requests waiting for': 'अभी कोई पौधा अनुरोध',
  'reviewer approval.': 'समीक्षक की स्वीकृति के लिए लंबित नहीं है।',
  'There are currently no plant requests waiting for reviewer approval.':
    'अभी कोई पौधा अनुरोध समीक्षक की स्वीकृति के लिए लंबित नहीं है।',
  'Pending Reviewer Review': 'समीक्षक की समीक्षा लंबित',
  'Employee Description': 'कर्मचारी का विवरण',
  'Status:': 'स्थिति:',
  'View Details': 'विवरण देखें',
  'Approved Plant Requests': 'अनुमोदित पौधा अनुरोध',
  'Loading approved requests...': 'अनुमोदित अनुरोध लोड हो रहे हैं...',
  'No Approved Requests': 'कोई अनुमोदित अनुरोध नहीं है',
  'No plant requests have been approved by the reviewer yet.':
    'समीक्षक ने अभी तक किसी पौधा अनुरोध को अनुमोदित नहीं किया है।',
  'APPROVED PLANT REQUEST': 'अनुमोदित पौधा अनुरोध',
  'Submitted by:': 'जमा करने वाला:',
  'Loading users...': 'उपयोगकर्ता लोड हो रहे हैं...',
  'Refreshing...': 'रीफ़्रेश हो रहा है...',
  Request: 'अनुरोध',
  'Back to Requests': 'अनुरोधों पर वापस जाएँ',
  'Request #': 'अनुरोध संख्या #',
  'PENDING_REVIEWER': 'समीक्षा लंबित',
  'Configure the order in which requests move through approval.':
    'अनुमोदन के दौरान अनुरोधों का क्रम निर्धारित करें।',
  'Changes to the hierarchy affect the approval workflow.':
    'पदानुक्रम में बदलाव अनुमोदन प्रक्रिया को प्रभावित करते हैं।',
  'Loading workflow...': 'कार्यप्रवाह लोड हो रहा है...',
  'No approval levels found': 'कोई अनुमोदन स्तर नहीं मिला',
  'Add an approval level to create the workflow.': 'कार्यप्रवाह बनाने के लिए अनुमोदन स्तर जोड़ें।',
  'Approval Levels': 'अनुमोदन स्तर',
  'Manage the roles in your approval workflow.': 'अपनी अनुमोदन प्रक्रिया में भूमिकाओं का प्रबंधन करें।',
  'Add Level': 'स्तर जोड़ें',
  'Loading approval levels...': 'अनुमोदन स्तर लोड हो रहे हैं...',
  'No approval levels configured.': 'कोई अनुमोदन स्तर निर्धारित नहीं है।',
  'Use "Add Level" to create the first level.': 'पहला स्तर बनाने के लिए "स्तर जोड़ें" चुनें।',
  'Approval Role': 'अनुमोदन भूमिका',
  'Approval Level': 'अनुमोदन स्तर',
  'The order in which this role approves requests (1 = first).':
    'इस भूमिका द्वारा अनुरोधों को अनुमोदित करने का क्रम (1 = पहला)।',
  'The value will be saved in uppercase.': 'यह मान बड़े अक्षरों में सहेजा जाएगा।',
  'Saving...': 'सहेजा जा रहा है...',
  'Manage your account details and login activity.': 'अपने खाते का विवरण और लॉगिन गतिविधि प्रबंधित करें।',
  'Login Activity': 'लॉगिन गतिविधि',
  'Show All Devices': 'सभी डिवाइस दिखाएँ',
  'Current session': 'वर्तमान सत्र',
  'Protected by session validation': 'सत्र सत्यापन द्वारा सुरक्षित',
  'Device records': 'डिवाइस रिकॉर्ड',
  'Stored in session history': 'सत्र इतिहास में सहेजा गया',
  Management: 'प्रबंधन',
  'View or sign out devices': 'डिवाइस देखें या साइन आउट करें',
  'Back to Account Settings': 'खाता सेटिंग्स पर वापस जाएँ',
  'Manage devices that have recently accessed your account.':
    'हाल ही में आपके खाते का उपयोग करने वाले डिवाइस प्रबंधित करें।',
  'Logout All Devices': 'सभी डिवाइस से लॉगआउट करें',
  'Unable to load device information': 'डिवाइस जानकारी लोड नहीं हो सकी',
  Retry: 'पुनः प्रयास करें',
  'Total Devices': 'कुल डिवाइस',
  'All session records': 'सभी सत्र रिकॉर्ड',
  'Active Devices': 'सक्रिय डिवाइस',
  'Currently active sessions': 'वर्तमान में सक्रिय सत्र',
  'Inactive Devices': 'निष्क्रिय डिवाइस',
  'Inactive session records': 'निष्क्रिय सत्र रिकॉर्ड',
  'Your Devices': 'आपके डिवाइस',
  'Loading logged-in devices...': 'लॉग-इन डिवाइस लोड हो रहे हैं...',
  'No device records found': 'कोई डिवाइस रिकॉर्ड नहीं मिला',
  'No session records are currently available for this account.':
    'इस खाते के लिए अभी कोई सत्र रिकॉर्ड उपलब्ध नहीं है।',
  Device: 'डिवाइस',
  Location: 'स्थान',
  'IP Address': 'आईपी पता',
  'Login Time': 'लॉगिन समय',
  'Last Active': 'अंतिम सक्रियता',
  'Enter the user information below.': 'नीचे उपयोगकर्ता की जानकारी दर्ज करें।',
  'Phone Number': 'फ़ोन नंबर',
  'Update Role': 'भूमिका अपडेट करें',
  'Not yet identified': 'अभी पहचान नहीं हुई',
  'Not provided': 'प्रदान नहीं किया गया',
  'No description provided': 'कोई विवरण प्रदान नहीं किया गया',
  'No plant requests': 'कोई पौधा अनुरोध नहीं',
  'Request details': 'अनुरोध विवरण',
  'Approve Request': 'अनुरोध अनुमोदित करें',
  'Reject Request': 'अनुरोध अस्वीकार करें',
  'Scientific name, latitude and longitude match an existing active record. Choose how to continue.':
    'वैज्ञानिक नाम, अक्षांश और देशांतर मौजूदा सक्रिय रिकॉर्ड से मेल खाते हैं। आगे बढ़ने का तरीका चुनें।',
  'Application &amp; Services': 'एप्लिकेशन और सेवाएँ',
  '(Current Snapshot)': '(वर्तमान स्थिति)',
  'View the devices currently logged into your account, including device type, location, IP address, login time and last active time.':
    'अपने खाते में लॉग-इन डिवाइस देखें, जिनमें डिवाइस का प्रकार, स्थान, आईपी पता, लॉगिन समय और अंतिम सक्रिय समय शामिल हैं।',
  to: 'तक',
  '✕ Reject': '✕ अस्वीकार करें',
  '✓ Approve Request': '✓ अनुरोध अनुमोदित करें',
  '✕ Reject Request': '✕ अनुरोध अस्वीकार करें',
  '↻ Refresh': '↻ रीफ़्रेश',
  '✓ Approved': '✓ अनुमोदित',
  '👁 View Details': '👁 विवरण देखें',
  APPROVED: 'अनुमोदित',
};

@Injectable({ providedIn: 'root' })
export class AppLanguageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly languageSubject = new BehaviorSubject<AppLanguage>(
    this.loadInitialLanguage(),
  );

  get language(): AppLanguage {
    return this.languageSubject.value;
  }

  setLanguage(language: string | null): void {
    if (language !== 'en' && language !== 'hi') {
      return;
    }

    this.languageSubject.next(language);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('selectedLanguage', language);
    }
  }

  translate(text: string): string {
    return this.language === 'hi' ? HINDI_TRANSLATIONS[text] ?? text : text;
  }

  private loadInitialLanguage(): AppLanguage {
    if (!isPlatformBrowser(this.platformId)) {
      return 'en';
    }

    const incomingLanguage = new URLSearchParams(window.location.search).get('lang');
    const savedLanguage = localStorage.getItem('selectedLanguage');
    const language =
      incomingLanguage === 'en' || incomingLanguage === 'hi'
        ? incomingLanguage
        : savedLanguage === 'en' || savedLanguage === 'hi'
          ? savedLanguage
          : 'en';

    localStorage.setItem('selectedLanguage', language);
    return language;
  }
}
