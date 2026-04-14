FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["ApiProduct/ApiProduct.csproj", "ApiProduct/"]
RUN dotnet restore "ApiProduct/ApiProduct.csproj"

COPY . .
WORKDIR "/src/ApiProduct"
RUN dotnet publish "ApiProduct.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ApiProduct.dll"]