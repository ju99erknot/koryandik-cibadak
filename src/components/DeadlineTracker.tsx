'use client';
import { useEffect } from 'react';
import { getCategories, getSubmissions, getSchools } from '@/lib/db';
import { showDynamicCountdown, hideDynamicCountdown } from '@/components/DynamicIsland';
import type { SessionUser } from '@/lib/types';
import type { Category } from '@/lib/schoolsData';

interface DeadlineTrackerProps {
  user: SessionUser;
}

export default function DeadlineTracker({ user }: DeadlineTrackerProps) {
  useEffect(() => {
    // Only check if user is logged in
    if (!user) return;

    let mounted = true;

    const checkDeadlines = async () => {
      try {
        const [categories, submissions, schools] = await Promise.all([
          getCategories(),
          getSubmissions(),
          getSchools()
        ]);

        if (!mounted) return;

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        let mostUrgent: { cat: Category; diffDays: number; deadlineDate: Date; unsubmittedCount: number } | null = null;

        for (const cat of categories) {
          // Calculate deadline date
          let deadlineDay = 15;
          if (cat.deadline) {
            const match = cat.deadline.match(/tanggal\s+(\d+)/i);
            if (match) {
              deadlineDay = parseInt(match[1]);
            }
          }
          const deadlineDate = new Date(currentYear, currentMonth, deadlineDay, 23, 59, 59);
          const diffTime = deadlineDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Only track if deadline is within 7 days
          if (diffDays <= 7 && diffDays >= -2) {
            let hasSubmitted = false;
            let unsubmittedCount = 0;

            if (user.role === 'school' && user.npsn) {
              hasSubmitted = submissions.some(
                s => s.schoolNpsn === user.npsn && 
                     s.categoryId === cat.id &&
                     (s.status === 'approved' || s.status === 'pending') &&
                     new Date(s.submittedAt).getMonth() === currentMonth &&
                     new Date(s.submittedAt).getFullYear() === currentYear
              );
            } else {
              // For admin/pengawas, count how many schools haven't submitted
              const submittedSchoolIds = new Set(
                submissions
                  .filter(s => s.categoryId === cat.id &&
                               (s.status === 'approved' || s.status === 'pending') &&
                               new Date(s.submittedAt).getMonth() === currentMonth &&
                               new Date(s.submittedAt).getFullYear() === currentYear)
                  .map(s => s.schoolNpsn)
              );
              unsubmittedCount = schools.length - submittedSchoolIds.size;
              // If all schools submitted, treat as "hasSubmitted"
              if (unsubmittedCount <= 0) hasSubmitted = true;
            }

            if (!hasSubmitted) {
              if (!mostUrgent || diffDays < mostUrgent.diffDays) {
                mostUrgent = { cat, diffDays, deadlineDate, unsubmittedCount };
              }
            }
          }
        }

        if (mostUrgent && mounted) {
          let message = '';
          if (user.role === 'school') {
            message = `Tenggat ${mostUrgent.cat.name}`;
          } else {
            message = `${mostUrgent.unsubmittedCount} Sekolah belum setor ${mostUrgent.cat.name}`;
          }
          
          showDynamicCountdown(mostUrgent.deadlineDate.toISOString(), message);
        } else if (mounted) {
          hideDynamicCountdown();
        }
      } catch (err) {
        console.error('Failed to check deadlines', err);
      }
    };

    checkDeadlines();
    
    // Check every hour just in case they leave it open
    const interval = setInterval(checkDeadlines, 60 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
      hideDynamicCountdown();
    };
  }, [user]);

  return null; // Logic only component
}
