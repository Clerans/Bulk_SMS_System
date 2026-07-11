export interface SmsTemplate {
  id: number;
  name: string;
  category: string;
  catColor: string;
  preview: string;
  variables: string[];
  usedIn: number;
}

const initialTemplates: SmsTemplate[] = [
  { id: 1, name: "Promotional Offer", category: "Promotion", catColor: "#8EA58C", preview: "Hi {name}! Get {discount}% OFF on all items. Use code {code}. Valid until {date}. Shop now: {link}", variables: ["name", "discount", "code", "date", "link"], usedIn: 34 },
  { id: 2, name: "OTP Verification", category: "OTP", catColor: "#3B82F6", preview: "Your verification code is {otp}. Valid for 5 minutes. Do not share this code with anyone.", variables: ["otp"], usedIn: 156 },
  { id: 3, name: "Invoice Reminder", category: "Invoice", catColor: "#F59E0B", preview: "Dear {name}, your invoice #{invoice_no} for LKR {amount} is due on {due_date}. Pay now: {link}", variables: ["name", "invoice_no", "amount", "due_date", "link"], usedIn: 28 },
  { id: 4, name: "Appointment Reminder", category: "Reminder", catColor: "#A78BFA", preview: "Hi {name}! Reminder: Your appointment is on {date} at {time}. Reply CANCEL to cancel.", variables: ["name", "date", "time"], usedIn: 67 },
  { id: 5, name: "Festival Greetings", category: "Festival", catColor: "#EF4444", preview: "Warmest {festival} greetings to you and your family from {company}! May this season bring joy and prosperity.", variables: ["festival", "company"], usedIn: 12 },
  { id: 6, name: "Birthday Wishes", category: "Birthday", catColor: "#EC4899", preview: "Happy Birthday, {name}! We have a special {discount}% birthday discount for you. Code: {code}. Valid today only!", variables: ["name", "discount", "code"], usedIn: 45 },
];

const getTemplates = (): SmsTemplate[] => {
  const data = localStorage.getItem("mock_templates");
  if (!data) {
    localStorage.setItem("mock_templates", JSON.stringify(initialTemplates));
    return initialTemplates;
  }
  return JSON.parse(data);
};

const saveTemplates = (list: SmsTemplate[]) => {
  localStorage.setItem("mock_templates", JSON.stringify(list));
};

export const templateApi = {
  list: async (): Promise<SmsTemplate[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getTemplates()), 400);
    });
  },

  create: async (template: Omit<SmsTemplate, "id" | "usedIn">): Promise<SmsTemplate> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getTemplates();
        const newTemplate: SmsTemplate = {
          ...template,
          id: list.length + 1,
          usedIn: 0,
        };
        list.push(newTemplate);
        saveTemplates(list);
        resolve(newTemplate);
      }, 500);
    });
  },

  delete: async (id: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getTemplates().filter((t) => t.id !== id);
        saveTemplates(list);
        resolve();
      }, 400);
    });
  },
};
