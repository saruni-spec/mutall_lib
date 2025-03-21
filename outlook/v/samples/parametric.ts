interface view_options {
    a:number,
    b:string
}

interface table_options extends view_options{
    c:number,
    e:string
}

abstract class view {
    abstract search<x extends keyof view_options>(key: x): view_options[x];
}


class table extends view {
    search<x extends keyof table_options>(key: x): table_options[x] {
        // Implementation goes here
        throw new Error("Method not implemented.");
    }
}