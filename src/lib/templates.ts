import { Node, Edge } from "reactflow";

export interface AutomationTemplate {
  key: string;
  name: string;
  description: string;
  platform: "instagram" | "facebook" | "whatsapp";
  triggerType: "comment_keyword" | "dm_keyword";
  nodes: Node[];
  edges: Edge[];
}

function flow(triggerLabel: string, triggerType: string, keyword: string, conditionLabel: string, actionLabel: string, actionType: string, content: string): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: [
      { id: "t1", type: "trigger", position: { x: 40, y: 120 }, data: { label: triggerLabel, triggerType, keyword } },
      { id: "c1", type: "condition", position: { x: 340, y: 120 }, data: { label: conditionLabel, matchType: "contains", value: keyword } },
      { id: "a1", type: "action", position: { x: 640, y: 120 }, data: { label: actionLabel, actionType, content } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1", animated: true, style: { stroke: "#5A43B8" } },
      { id: "e2", source: "c1", sourceHandle: "yes", target: "a1", animated: true, style: { stroke: "#3DDC84" } },
    ],
  };
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    key: "comment_to_dm",
    name: "Comment keyword → DM",
    description: "Someone comments a keyword on your post — they get an instant DM.",
    platform: "instagram",
    triggerType: "comment_keyword",
    ...flow("Comment received", "comment_keyword", "price", "Contains keyword", "Send DM", "send_text",
      "Thanks for your interest! Here's the info you asked for 👇"),
  },
  {
    key: "whatsapp_product_info",
    name: "WhatsApp keyword → product info",
    description: "A keyword in WhatsApp triggers your product details and a link.",
    platform: "whatsapp",
    triggerType: "dm_keyword",
    ...flow("WhatsApp message", "dm_keyword", "info", "Contains keyword", "Send product info", "send_text",
      "Here's what you need to know about our product — let us know if you have questions!"),
  },
  {
    key: "faq_bot",
    name: "FAQ bot",
    description: "Reply automatically to a common question, e.g. 'hours' or 'shipping'.",
    platform: "instagram",
    triggerType: "dm_keyword",
    ...flow("DM received", "dm_keyword", "hours", "Contains keyword", "Send FAQ answer", "send_text",
      "We're open Mon–Sat, 10am–7pm IST. Anything else we can help with?"),
  },
  {
    key: "lead_capture",
    name: "Lead capture",
    description: "Keyword reply that asks for contact details to follow up later.",
    platform: "facebook",
    triggerType: "comment_keyword",
    ...flow("Comment received", "comment_keyword", "interested", "Contains keyword", "Ask for details", "send_text",
      "Thanks for your interest! Could you share your email or phone number so our team can follow up?"),
  },
  {
    key: "support_escalation",
    name: "Support escalation",
    description: "Keyword like 'help' sends a holding reply, then hands off to a human.",
    platform: "instagram",
    triggerType: "dm_keyword",
    nodes: [
      { id: "t1", type: "trigger", position: { x: 40, y: 120 }, data: { label: "DM received", triggerType: "dm_keyword", keyword: "help" } },
      { id: "c1", type: "condition", position: { x: 320, y: 120 }, data: { label: "Contains keyword", matchType: "contains", value: "help" } },
      { id: "a1", type: "action", position: { x: 600, y: 40 }, data: { label: "Acknowledge", actionType: "send_text", content: "Thanks for reaching out — a team member will be with you shortly." } },
      { id: "a2", type: "action", position: { x: 600, y: 200 }, data: { label: "Hand off to human", actionType: "human_handoff" } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "c1", animated: true, style: { stroke: "#5A43B8" } },
      { id: "e2", source: "c1", sourceHandle: "yes", target: "a1", animated: true, style: { stroke: "#3DDC84" } },
      { id: "e3", source: "c1", sourceHandle: "yes", target: "a2", animated: true, style: { stroke: "#3DDC84" } },
    ],
  },
];

export function blankFlow(): { nodes: Node[]; edges: Edge[] } {
  return { nodes: [], edges: [] };
}
