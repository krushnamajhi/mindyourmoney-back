export const round = () =>  {
    return { 
        currency : (val: number) => Math.round(val * 100) / 100,
         percent : (val: number) => Math.round(val * 100) / 100 
    }
}