FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["ApiInvoice/ApiInvoice.csproj", "ApiInvoice/"]
RUN dotnet restore "ApiInvoice/ApiInvoice.csproj"

COPY . .
WORKDIR "/src/ApiInvoice"
RUN dotnet publish "ApiInvoice.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ApiInvoice.dll"]