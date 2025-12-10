'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/app/provider';
import { supabase } from '@/services/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
} from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';
import { DB_TABLES } from '@/services/Constants';

export default function CandidateInterviews() {
  const { user } = useUser();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchCandidateInterviews = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all interview results for this candidate
      const { data: results, error } = await supabase
        .from(DB_TABLES.INTERVIEW_RESULTS)
        .select(
          `
          *,
        ${DB_TABLES.INTERVIEWS} (
            job_position,
            job_description,
            type,
            duration,
            created_at,
            email
          )
        `
        )
        .eq('email', user.email)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching interviews:', error);
        toast.error('Failed to load interviews');
        return;
      }

      setInterviews(results || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCandidateInterviews();
    }
  }, [user, fetchCandidateInterviews]);

  // Removed unused score helpers (not referenced in JSX)

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-teal-500" />;
      case 'in_progress':
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        <span className="ml-2 text-gray-600">Loading your interviews...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Interviews</h1>
        <p className="text-gray-600 mt-1">
          Track all your interview sessions and results
        </p>
      </div>

      {interviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No interviews yet
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              You haven&apos;t participated in any interviews yet. When you
              complete an interview, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {interviews.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Video className="w-5 h-5 text-teal-600" />
                      <CardTitle className="text-lg">
                        {result.Interviews?.job_position || 'Interview'}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {moment(result.created_at).format('MMM DD, YYYY')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {result.Interviews?.duration || 'N/A'}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {result.Interviews?.type || 'Interview'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <Badge
                      variant={
                        result.status === 'completed' ? 'default' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {result.status === 'completed'
                        ? 'In Progress'
                        : 'Completed'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">
                      You will be emailed from the recruiter.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
