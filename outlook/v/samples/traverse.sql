#Query for testing inter-zone traversing
select
    # student and subject are the 2 anonymous colums that are common to 2 
    #homozones through which we need to traverse
    reverse(student.name) as student,
    subject.id as subject,
    #
    #Primary keys for scores will be shown in the first homozone. Initially they
    # will be visible, then we hide them
    score.score as 'score.score',
    #
    #Score values will be shown in 2nd zone
    score.value as 'score.value'
from score 
    inner join candidate on score.candidate=candidate.candidate
    inner join progress on candidate.progress =progress .progress
    inner join student on progress.student = student.student
    inner join performance on score.performance=performance.performance
    inner join sitting on performance.sitting=sitting.sitting
    inner join subject on performance.subject=subject.subject
where 
    sitting.sitting=1