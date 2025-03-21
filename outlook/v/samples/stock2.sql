with 
    #
    # The template query that generates the data entry template. This table is 
    # left joined to teh data data table to gemerate the joint version
    # In our case, its the product table
    template as (
        select
            #
            #The product primary key
            product.product as `product.product`,

            # The default product unit will be assumed
            product.unit as `stock.unit`,
            #
            #Product name will be read-only, i.e., for display only
            product.name
        from
            product
    ),
    #
    # The data query identifies all columns that are new inputs. In our case the 
    # session date is a new input
    `data` as (
        select
            product.product,
            stock.stock as `stock.stock`,
            stock.qty as `stock.qty`
        from
            stock
            inner join product on stock.product = product.product
            inner join session on stock.session=session.session
        where
            # The date of stock taking is known
            session.date='2024-06-05'
    ),
    #
    #The shape of the complete data entry form
    `form` as (
        select
            `stock.unit`,
            `product.product`,
            #
            #Poduct name is read-only. It needs not be saved to database
            name,
            `stock.stock`,
            `stock.qty`
        from
            template
            left join `data` on `data`.product = template.`product.product`
        order by name    
    )
    select
        #Data may come frob db or template
        #
        `stock.unit`,
        `product.product`,
        #
        #Poduct name is read-only. It needs not be saved to database
        name,
        `stock.stock`,
        `stock.qty`    
    from
        form