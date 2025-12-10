'use client';
import { useUser } from '@/app/provider';
import { Button } from '@/components/ui/button';
import { supabase } from '@/services/supabaseClient';
import { Video } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import InterviewCard from '../dashboard/_components/interviewcard';
import { useRouter } from 'next/navigation';
import { DB_TABLES } from '@/services/Constants';

function AllInterview() {
  const router = useRouter();

  const [InterviewList, setInterviewList] = useState([]);
  const { user } = useUser();

  const GetInterviewList = useCallback(async () => {
    let { data: Interviews, error } = await supabase
      .from(DB_TABLES.INTERVIEWS)
      .select(`*, ${DB_TABLES.INTERVIEW_RESULTS}(*)`) // <-- JOIN the related table
      .eq('email', user?.email)
      .order('id', { ascending: false });
    if (error) {
      console.error('Error fetching interviews:', error);
      return;
    }

    console.log(Interviews);
    setInterviewList(Interviews);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await GetInterviewList();
    })();
  }, [user, GetInterviewList]);

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
            onClick={() => router.push('/dashboard/create-interview')}
          >
            + Create New Interview
          </Button>
        </div>
      ) : (
        InterviewList && (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
            {InterviewList.map((interview, index) => (
              <InterviewCard interview={interview} key={index} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
export default AllInterview;
