#How to creating a new exam result
/*
Heterozone plan. NB. The zones marked with * hidden from user
[
    [null*, null*, performaces*]
    [null, null*, subjects],
    [students, years*, scores]
]
*/
with
    # This is a seleccion of all the scores. The key feature is the join
    # The fieldlist is suggested by driver sources of the heterrozone
    `all` as (
        select
            # Suggesions from template
            progress.progress as `progress.progress`,
            subject.subject as `subject.subject`,
            sitting.sitting as `sitting.sitting`,
            
            year.year as `year.year`,
            subject.id as subject_id,
            performance.out_of as `performance.out_of`,
            
            # Suggestions from newdata
            score.value as `score.value`,
            candidate.candidate as `candidate.candidate`,
            performance.performance as `performance.performance`,
            sitting.date `sitting.date`,
            #
            reverse(student.name) as student_name
        from score 
            inner join candidate on score.candidate=candidate.candidate
            inner join progress on candidate.progress =progress.progress
            inner join year on progress.year = year.year
            inner join student on progress.student = student.student
            inner join performance on score.performance=performance.performance
            inner join sitting on performance.sitting=sitting.sitting
            inner join subject on performance.subject=subject.subject
        
    ),
    # Old data that is similar to desired
    template as ( select * from `all` where `sitting.sitting`=1),
    # 
    `data` as (select * from `all` where `sitting.date` = '2024-05-30'),
    #
    # Join the data to the template. This will be used as the base of all the
    #other sources of axis
    joint as (
        select
            template.`progress.progress`,
            template.`subject.subject`,
            template.`year.year`,
            template.subject_id,
            template.`performance.out_of`,
            template.student_name,
            #
            `data`.`score.value`,
            `data`.`candidate.candidate`,
            `data`.`performance.performance`,
            '2024-05-30' as `sitting.date`

        from
            template
            left join `data` on
                template.`progress.progress`=`data`.`progress.progress`
                and template.`subject.subject`=`data`.`subject.subject`
    ),
    #
    #Define the homozone sources
    scores as (
        select
            `progress.progress`,
            `subject.subject`,
            `score.value`
        from joint
    ),
    #
    #The subject, to be placed in the top header and trsnsponsed
    subjects as (
        select distinct
            `sitting.date`,
            `subject.subject`,
            subject_id,
            `performance.out_of`
        from joint
    ),
    performances as (
        select distinct
            `subject.subject`,
            `performance.performance`
        from joint    
    ),
    students as (
        select distinct
            `progress.progress`,
            student_name
        from joint
    ),
    years as (
        select distinct
            `progress.progress`,
            `candidate.candidate` as `-candidate.candidate`,
            `year.year`
        from joint
    )
    