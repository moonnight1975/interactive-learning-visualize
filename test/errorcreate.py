import random
from datetime import datetime, timedelta

def generate_attack_log(filename="attack_log.txt", lines=1500):
    start_time = datetime.now()
    
    with open(filename, "w") as f:
        for i in range(lines):
            time = start_time + timedelta(seconds=i)
            
            if i % 500 == 0:
                message = "CRITICAL SECURITY BREACH DETECTED"
            elif i % 200 == 0:
                message = "ERROR Disk failure"
            else:
                message = "INFO Normal operation"
            
            f.write(f"{time} {message}\n")

    print(f"{filename} generated with attack patterns.")

generate_attack_log()