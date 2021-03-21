module.exports = class shortDate{
    fromInt(y, m, d){
        if (y < 100) {
            y = 2000 + y;
        }
        this.year = y;
        this.month = m;
        this.day = d;
    }

    constructor(str){
        if (str === undefined)
        {
            let today = new Date();
            this.day = today.getDate();
            this.month = today.getMonth()+1;
            this.year = today.getFullYear();
        } else if (typeof(str) === 'string'){
            this.year = Number(str.slice(0, 4));
            this.month = Number(str.slice(4,6));
            this.day = Number(str.slice(6,8));
        } else {
            let today = new Date();
            this.day = today.getDate();
            this.month = today.getMonth()+1;
            this.year = today.getFullYear();
        }
    }

   toString(){
       if (this.year < 1000) {
           this.year = 2000 + this.year;
       } 
       let mo = ( this.month < 10 ? '0'+this.month : this.month);
       let da = ( this.day < 10 ? '0'+this.day : this.day);
       return ''+this.year+""+mo+""+da;
   }

   fromString(str){
        this.year = Number(str.slice(0, 4));
        this.month = Number(str.slice(4,6));
        this.day = Number(str.slice(6,8));
   };

   isEqual(otherDate){
       return ((this.day === otherDate.day) 
       && (this.month === otherDate.month) 
       && (this.year === otherDate.year));
   };
};

