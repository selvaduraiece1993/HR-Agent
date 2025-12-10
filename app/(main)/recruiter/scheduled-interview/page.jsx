'use client';
import { useUser } from '@/app/provider';
import { Button } from '@/components/ui/button';
import { supabase } from '@/services/supabaseClient';
import { Video } from 'lucide-react';
import React, { useEffect, useState, useCallback } from 'react';
import InterviewCard from '../dashboard/_components/interviewcard';
import { useRouter } from 'next/navigation';
import { DB_TABLES } from '@/services/Constants';

function ScheduledInterview() {
  const { user } = useUser();
  const router = useRouter();
  const [interviewList, setInterviewList] = useState();

  const GetInterviewList = useCallback(async () => {
    const result = await supabase
      .from(DB_TABLES.INTERVIEWS)
      .select(
        `
      job_position,
      duration,
      interview_id,
    ${DB_TABLES.INTERVIEW_RESULTS} (
        email,
        conversation_transcript,
        completed_at
      )
    `
      )
      .eq('email', user?.email)
      .order('id', { ascending: false });

    console.log(result);
    setInterviewList(result.data);
  }, [user?.email]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await GetInterviewList();
    })();
  }, [GetInterviewList]);

  return (
    <div className="mt-5">
      <h2 className="font-bold text-2xl mb-4">Interview List with feedback</h2>
      {interviewList?.length === 0 ? (
        <div className="p-5 flex flex-col items-center gap-3 text-center text-gray-500 bg-white border rounded-xl shadow-sm">
          <Video className="text-primary h-10 w-10" />
          <h2 className="text-base">
            You don&apos;t have any interview created
          </h2>
          <Button
            className="cursor-pointer"
            onClick={() => router.push('/recruiter/dashboard/create-interview')}
          >
            + Create New Interview
          </Button>
        </div>
      ) : (
        interviewList && (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
            {interviewList?.map((interview, index) => (
              <InterviewCard
                interview={interview}
                key={index}
                viewDetail={true}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default ScheduledInterview;
