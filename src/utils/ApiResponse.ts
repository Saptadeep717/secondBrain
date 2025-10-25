export default class ApiResponse{
    private statusCode: number;
    private message: string;
    private data: any;

    constructor(statusCode: number, message: string, data: any = null){
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }

    private send(){
        return {
            statusCode: this.statusCode,
            message: this.message,
            data: this.data
        }
    }
    public static success(message: string, data: any = null){
        const response = new ApiResponse(200, message, data);
        return response.send();
    }

    public static created(message: string, data: any = null){
        return new ApiResponse(201, message, data).send();
        
    }
}