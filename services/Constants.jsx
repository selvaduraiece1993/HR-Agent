import {
  BriefcaseBusinessIcon,
  Code2Icon,
  User2Icon,
  Component,
  Puzzle,
  Calendar,
  LayoutDashboard,
  List,
  WalletCards,
  Video,
} from 'lucide-react';

export const SideBarOptions = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    path: '/recruiter/dashboard',
  },
  {
    name: 'Scheduled Interview',
    icon: Calendar,
    path: '/recruiter/scheduled-interview',
  },
  {
    name: 'All Interview',
    icon: List,
    path: '/recruiter/all-interview',
  },
  {
    name: 'Profile',
    icon: User2Icon,
    path: '/recruiter/profile',
  },
  {
    name: 'Billing',
    icon: WalletCards,
    path: '/recruiter/billing',
  },
];

export const SideBarCondidate = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    path: '/candidate/dashboard',
  },
  {
    name: 'Interviews',
    icon: Video,
    path: '/candidate/interviews',
  },
  {
    name: 'Profile',
    icon: User2Icon,
    path: '/candidate/profile',
  },
];

export const InterviewType = [
  {
    name: 'Technical',
    icon: Code2Icon,
  },
  {
    name: 'Behavioral',
    icon: User2Icon,
  },
  {
    name: 'Experience',
    icon: BriefcaseBusinessIcon,
  },
  {
    name: 'Problem Solving',
    icon: Puzzle,
  },
  {
    name: 'Leadership',
    icon: Component,
  },
];

export const QUESTIONS_PROMPT = `You are an expert technical interviewer.
Based on the following inputs, generate a well-structured list of high-quality interview questions including candidate introduction, salary negotiation, and closing questions.

Job Title: {{job_position}}

Job Description:{{job_description}}

Interview Duration: {{duration}}

Interview Type: {{type}}

📝 Your task:

Analyze the job description to identify key responsibilities, required skills, and expected experience.

Generate a list of 2 interview questions depends on interview duration

Adjust the number and depth of questions to match the interview duration or more.

Ensure the questions match the tone and structure of a real-life {{type}} interview.

🧩 Format your response in JSON format with array list of questions.
format: interviewQuestions=[
{
 question:'',
 type:'Candidate selfIntroduction about education background, work experience/Candidate home and working locations/worked previous and current working company/Why Should we hire you/Present salary negotiation/Technical/Behavioral/Experience/Problem Solving/Leadership'
},{
...
}]

🎯 The goal is to create a structured, relevant, and time-optimized interview plan for a {{job_position}} role.`;

export const FEEDBACK_PROMPT = `{{conversation}}

Depends on this Interview Conversation between assitant and user, 

Give me feedback for user interview. Give me rating out of 10 for technical Skills, 

Communication, Problem Solving, Experience. Also give me summery in 3 lines 

about the interview and one line to let me know whether is recommended 

for hire or not with message very strictly. Give me response in JSON format

{

    feedback:{

        rating:{

            TechnicalSkills:5,

            Communication:6,

            ProblemSolving:4,

            Experience:7,

            Behavioral:8,

            Analysis:9



        },

        summery:<in 3 Line>,

        Recommendation:'',

        Recommendation Message:''



    }

}

`;

export const DB_TABLES = {
  USERS: process.env.NEXT_PUBLIC_USERS_TABLE_NAME,
  INTERVIEWS: process.env.NEXT_PUBLIC_INTERVIEWS_TABLE_NAME,
  INTERVIEW_RESULTS: process.env.NEXT_PUBLIC_INTERVIEW_RESULTS_TABLE_NAME,
  // Note: interview_results table should have these columns:
  // - id, fullname, email, interview_id, conversation_transcript (jsonb),
  // - recommendations, completed_at, video_recording_url (text, nullable)
};

export const GOOGLE_MODELS = {
  QUESTION_GENERATION: process.env.GOOGLE_MODEL_QUESTION_GENERATION,
  ANSWER_EVALUATION: process.env.GOOGLE_MODEL_ANSWER_EVALUATION,
  FEEDBACK: process.env.GOOGLE_MODEL_FEEDBACK,
};

export const OPENROUTER_MODELS = {
  QUESTION_GENERATION: process.env.OPENROUTER_MODEL_QUESTION_GENERATION,
  ANSWER_EVALUATION: process.env.OPENROUTER_MODEL_ANSWER_EVALUATION,
  FEEDBACK: process.env.OPENROUTER_MODEL_FEEDBACK,
};

export const AZURE_MODELS = {
  QUESTION_GENERATION: process.env.AZURE_OPENAI_MODEL_QUESTION_GENERATION,
  ANSWER_EVALUATION: process.env.AZURE_OPENAI_MODEL_ANSWER_EVALUATION,
  FEEDBACK: process.env.AZURE_OPENAI_MODEL_FEEDBACK,
};

export const ANTHROPIC_MODELS = {
  QUESTION_GENERATION: process.env.ANTHROPIC_MODELS_QUESTION_GENERATION,
  ANSWER_EVALUATION: process.env.ANTHROPIC_MODELS_ANSWER_EVALUATION,
  FEEDBACK: process.env.ANTHROPIC_MODELS_FEEDBACK,
};

export const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openrouter';
