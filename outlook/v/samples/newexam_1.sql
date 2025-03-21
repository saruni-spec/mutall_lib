#How to creating a new exam result
/*
[
    [null, null*, subject],
    [student, year*, score]
]
*/
with
    score as (
        select
            subject.subject as `subject.subject`,
            '2024-05-30' as `sitting.date`,
            subject.id as subject_id,
            performance.out_of `performance.out_of`,

            progress.progress as `progress.progress`,
            year.year as `year.year`,
            reverse(student.name) as student_name,

            #The empty score values
            null as `score.value`

        from score 
            inner join candidate on score.candidate=candidate.candidate
            inner join progress on candidate.progress =progress .progress
            inner join year on progress.year = year.year
            inner join student on progress.student = student.student
            inner join performance on score.performance=performance.performance
            inner join sitting on performance.sitting=sitting.sitting
            inner join subject on performance.subject=subject.subject
        where 
            sitting.sitting=1
    ),
    subject as (
        select distinct
            `subject.subject`, `sitting.date`,subject_id, `performance.out_of`, null as `performance.performance`
        from score
    ),
    student as (
        select distinct
            `progress.progress`, student_name
        from score
    ),
    year as (
        select distinct
            `progress.progress`, `year.year`, null as 'candidate.candidate'
        from score
    )