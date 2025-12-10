'use client';
import { Video } from 'lucide-react';
import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { supabase } from '@/services/supabaseClient';
import { useUser } from '@/app/provider';
import InterviewCard from './interviewcard';
import { DB_TABLES } from '@/services/Constants';

function LatestInterviewsList() {
  const router = useRouter();

  const [InterviewList, setInterviewList] = useState([]);
  const { user } = useUser();

  // Stable callback so it can be safely called from useEffect
  const GetInterviewList = useCallback(async () => {
    let { data: Interviews, error: fetchError } = await supabase
      .from(DB_TABLES.INTERVIEWS)
      .select(`*, ${DB_TABLES.INTERVIEW_RESULTS}(*)`) // <-- JOIN the related table
      .eq('email', user?.email)
      .order('id', { ascending: false })
      .limit(6);
    if (fetchError) console.debug('Error fetching interviews:', fetchError);
    console.log(Interviews);
    setInterviewList(Interviews);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await GetInterviewList();
    })();
  }, [user, GetInterviewList]);

  const handleInterviewDelete = () => {
    // Refresh the interview list after deletion
    GetInterviewList();
  };

  return (
    <div className="my-5">
      <h2 className="font-bold text-2xl mb-4">Previously Created Interviews</h2>

      {InterviewList?.length === 0 ? (
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
        InterviewList && (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
            {InterviewList.map((interview, index) => (
              <InterviewCard
                interview={interview}
                key={index}
                onDelete={handleInterviewDelete}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default LatestInterviewsList;
